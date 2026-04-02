import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore, type Message } from '../stores/chatStore'
import { useActivityStore } from '../stores/activityStore'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const WS_BASE =
  import.meta.env.VITE_WS_BASE_URL ??
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function useHermesChat(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentMsgIdRef = useRef<string | null>(null)

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

  // Ensure an assistant message exists, return its id
  const ensureAssistantMsg = useCallback(() => {
    if (!currentMsgIdRef.current) {
      const id = makeId()
      currentMsgIdRef.current = id
      const msg: Message = {
        id,
        role: 'assistant',
        content: '',
        thinking: [],
        toolCalls: [],
        streaming: true,
        timestamp: Date.now(),
      }
      addMessage(msg)
      setStreaming(true)
    }
    return currentMsgIdRef.current
  }, [addMessage, setStreaming])

  const connect = useCallback(() => {
    if (!sessionId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const url = `${WS_BASE}/ws/chat/${sessionId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      if (pingTimer.current) clearInterval(pingTimer.current)
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type: string
          content?: string
          name?: string
          input?: Record<string, unknown>
          message?: string
          tool_call_id?: string
        }

        if (data.type === 'thinking') {
          // Pre-response internal monologue — accumulate into thinking block
          const id = ensureAssistantMsg()
          appendThinking(id, data.content ?? '')
          pushEvent({ type: 'thinking', label: 'thinking', detail: data.content, timestamp: Date.now(), sessionId: sessionId ?? '' })

        } else if (data.type === 'token') {
          const id = ensureAssistantMsg()
          appendToken(id, data.content ?? '')

        } else if (data.type === 'tool_call') {
          const id = ensureAssistantMsg()
          addToolCall(id, {
            id: data.tool_call_id ?? makeId(),
            name: data.name ?? 'unknown',
            input: data.input ?? {},
            running: true,
          })
          pushEvent({ type: 'tool_call', label: data.name ?? 'unknown', detail: JSON.stringify(data.input ?? {}), timestamp: Date.now(), sessionId: sessionId ?? '' })

        } else if (data.type === 'tool_result') {
          const msgId = currentMsgIdRef.current
          if (msgId) {
            const messages = useChatStore.getState().messages
            const msg = messages.find((m) => m.id === msgId)
            const pending = msg?.toolCalls?.find((tc) => tc.running)
            if (pending) {
              updateToolResult(msgId, pending.id, data.content ?? '')
              pushEvent({ type: 'tool_result', label: `${pending.name} result`, timestamp: Date.now(), sessionId: sessionId ?? '' })
            }
          }

        } else if (data.type === 'done') {
          if (currentMsgIdRef.current) {
            setMessageStreaming(currentMsgIdRef.current, false)
          }
          currentMsgIdRef.current = null
          setStreaming(false)
          pushEvent({ type: 'response', label: 'Response complete', timestamp: Date.now(), sessionId: sessionId ?? '' })

        } else if (data.type === 'error') {
          if (currentMsgIdRef.current) {
            setMessageStreaming(currentMsgIdRef.current, false)
          }
          currentMsgIdRef.current = null
          setStreaming(false)
          addMessage({
            id: makeId(),
            role: 'assistant',
            content: `⚠ Error: ${data.message ?? 'Unknown error'}`,
            timestamp: Date.now(),
          })
        }
      } catch {
        // malformed JSON — ignore
      }
    }

    ws.onerror = () => setStatus('error')

    ws.onclose = () => {
      setStatus('disconnected')
      wsRef.current = null
      if (pingTimer.current) clearInterval(pingTimer.current)
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [
    sessionId,
    ensureAssistantMsg,
    addMessage,
    appendToken,
    appendThinking,
    addToolCall,
    updateToolResult,
    setStreaming,
    setMessageStreaming,
    pushEvent,
  ])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (pingTimer.current) clearInterval(pingTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendMessage = useCallback(
    (content: string, files: string[] = []) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return

      const userMsg: Message = {
        id: makeId(),
        role: 'user',
        content,
        files,
        timestamp: Date.now(),
      }
      addMessage(userMsg)
      currentMsgIdRef.current = null
      pushEvent({ type: 'user_message', label: content.slice(0, 60) + (content.length > 60 ? '…' : ''), timestamp: Date.now(), sessionId: sessionId ?? '' })

      wsRef.current.send(JSON.stringify({ content, files }))
    },
    [addMessage]
  )

  return { status, sendMessage }
}
