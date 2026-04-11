import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore, type Message } from '../stores/chatStore'
import { useActivityStore } from '../stores/activityStore'
import { getApiBase } from '../lib/api'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function useHermesChat(sessionId: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const abortRef = useRef<AbortController | null>(null)

  const {
    addMessage,
    appendToken,
    appendThinking,
    addToolCall,
    updateToolResult,
    setStreaming,
    setMessageStreaming,
  } = useChatStore()

  const pushEvent = useActivityStore((s) => s.pushEvent)

  // Health poll — drives the connection indicator
  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch(`${getApiBase()}/health`, {
          signal: AbortSignal.timeout(5000),
        })
        if (!cancelled) setStatus(res.ok ? 'connected' : 'error')
      } catch {
        if (!cancelled) setStatus('disconnected')
      }
    }

    check()
    const timer = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const sendMessage = useCallback(
    async (content: string, files: string[] = []) => {
      if (!sessionId) return

      // Cancel any in-flight SSE request
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      // User message into store
      addMessage({
        id: makeId(),
        role: 'user',
        content,
        files,
        timestamp: Date.now(),
      } satisfies Message)

      pushEvent({
        type: 'user_message',
        label: content.slice(0, 60) + (content.length > 60 ? '…' : ''),
        timestamp: Date.now(),
        sessionId,
      })

      // Per-turn tracking (local to this call — no refs needed)
      let msgId: string | null = null
      const toolQueue = new Map<string, string[]>() // tool_name → [internal IDs]
      let thinkingFired = false
      let thinkingCount = 0

      setStreaming(true)
      setStatus('connecting')

      const processEvent = (eventName: string, data: Record<string, unknown>) => {
        switch (eventName) {
          // ── Assistant message created ────────────────────────────────────
          case 'message.started': {
            msgId = makeId()
            addMessage({
              id: msgId,
              role: 'assistant',
              content: '',
              thinking: [],
              toolCalls: [],
              streaming: true,
              timestamp: Date.now(),
            })
            break
          }

          // ── Streaming text token ─────────────────────────────────────────
          case 'assistant.delta': {
            if (msgId) appendToken(msgId, (data.delta as string) ?? '')
            break
          }

          // ── Internal thinking (_thinking tool) ──────────────────────────
          case 'tool.progress': {
            if (!msgId) break
            appendThinking(msgId, (data.delta as string) ?? '')
            thinkingCount++
            if (!thinkingFired) {
              thinkingFired = true
              pushEvent({ type: 'thinking', label: 'thinking (1 line)', timestamp: Date.now(), sessionId })
            } else {
              useActivityStore.getState().updateLatestThinking(sessionId, thinkingCount)
            }
            break
          }

          // ── Tool call started ────────────────────────────────────────────
          case 'tool.started': {
            if (!msgId) break
            const tcId = makeId()
            const name = (data.tool_name as string) ?? 'unknown'
            addToolCall(msgId, {
              id: tcId,
              name,
              input: (data.args as Record<string, unknown>) ?? {},
              running: true,
            })
            if (!toolQueue.has(name)) toolQueue.set(name, [])
            toolQueue.get(name)!.push(tcId)
            pushEvent({ type: 'tool_call', label: name, timestamp: Date.now(), sessionId })
            break
          }

          // ── Tool call finished ───────────────────────────────────────────
          case 'tool.completed': {
            if (!msgId) break
            const name = (data.tool_name as string) ?? 'unknown'
            const tcId = toolQueue.get(name)?.shift()
            if (tcId) {
              updateToolResult(msgId, tcId, (data.result_preview as string) ?? '')
              pushEvent({ type: 'tool_result', label: `${name} result`, timestamp: Date.now(), sessionId })
            }
            break
          }

          // ── Full content available (fallback if delta wasn't streamed) ───
          case 'assistant.completed': {
            if (msgId && data.content) {
              const existing = useChatStore.getState().messages.find((m) => m.id === msgId)?.content ?? ''
              if (!existing) appendToken(msgId, data.content as string)
            }
            break
          }

          // ── Stream finished ──────────────────────────────────────────────
          case 'done': {
            if (msgId) setMessageStreaming(msgId, false)
            setStreaming(false)
            pushEvent({ type: 'response', label: 'Response complete', timestamp: Date.now(), sessionId })
            break
          }
        }
      }

      try {
        const res = await fetch(
          `${getApiBase()}/api/sessions/${sessionId}/chat/stream`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content }),
            signal: abort.signal,
          }
        )

        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        if (!res.body) throw new Error('No response body')

        setStatus('connected')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })

          // SSE blocks are separated by double newline
          const blocks = buf.split('\n\n')
          buf = blocks.pop() ?? ''

          for (const block of blocks) {
            if (!block.trim()) continue

            let eventName = 'message'
            let dataStr = ''
            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) eventName = line.slice(7).trim()
              else if (line.startsWith('data: ')) dataStr = line.slice(6)
            }

            if (!dataStr || dataStr === '[DONE]') continue

            try {
              processEvent(eventName, JSON.parse(dataStr) as Record<string, unknown>)
            } catch {
              // ignore malformed JSON frames
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return

        if (msgId) setMessageStreaming(msgId, false)
        addMessage({
          id: makeId(),
          role: 'assistant',
          content: `⚠ Error: ${(err as Error).message ?? 'Connection failed'}`,
          timestamp: Date.now(),
        })
        setStatus('error')
        setTimeout(() => setStatus('connected'), 3000)
      } finally {
        if (msgId) setMessageStreaming(msgId, false)
        setStreaming(false)
      }
    },
    [
      sessionId,
      addMessage,
      appendToken,
      appendThinking,
      addToolCall,
      updateToolResult,
      setStreaming,
      setMessageStreaming,
      pushEvent,
    ]
  )

  return { status, sendMessage }
}
