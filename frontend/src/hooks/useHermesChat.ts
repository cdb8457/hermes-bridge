import { useCallback, useEffect, useRef, useState } from 'react'
import { useChatStore, type Message } from '../stores/chatStore'

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
  const currentMsgIdRef = useRef<string | null>(null)

  const {
    addMessage,
    appendToken,
    addToolCall,
    updateToolResult,
    setStreaming,
    setMessageStreaming,
  } = useChatStore()

  const connect = useCallback(() => {
    if (!sessionId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('connecting')
    const url = `${WS_BASE}/ws/chat/${sessionId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus('connected')

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

        if (data.type === 'token') {
          if (!currentMsgIdRef.current) {
            // Start a new assistant message
            const id = makeId()
            currentMsgIdRef.current = id
            const msg: Message = {
              id,
              role: 'assistant',
              content: '',
              streaming: true,
              timestamp: Date.now(),
            }
            addMessage(msg)
            setStreaming(true)
          }
          appendToken(currentMsgIdRef.current, data.content ?? '')
        } else if (data.type === 'tool_call') {
          const msgId = currentMsgIdRef.current
          if (msgId) {
            addToolCall(msgId, {
              id: data.tool_call_id ?? makeId(),
              name: data.name ?? 'unknown',
              input: data.input ?? {},
            })
          }
        } else if (data.type === 'tool_result') {
          // Best effort — find the last tool call without a result
          const msgId = currentMsgIdRef.current
          if (msgId) {
            const messages = useChatStore.getState().messages
            const msg = messages.find((m) => m.id === msgId)
            const pending = msg?.toolCalls?.find((tc) => !tc.result)
            if (pending) {
              updateToolResult(msgId, pending.id, data.content ?? '')
            }
          }
        } else if (data.type === 'done') {
          if (currentMsgIdRef.current) {
            setMessageStreaming(currentMsgIdRef.current, false)
          }
          currentMsgIdRef.current = null
          setStreaming(false)
        } else if (data.type === 'error') {
          if (currentMsgIdRef.current) {
            setMessageStreaming(currentMsgIdRef.current, false)
          }
          currentMsgIdRef.current = null
          setStreaming(false)
          // Append error note to the last message or show inline
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
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [
    sessionId,
    addMessage,
    appendToken,
    addToolCall,
    updateToolResult,
    setStreaming,
    setMessageStreaming,
  ])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const sendMessage = useCallback(
    (content: string, files: string[] = []) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return

      // Add user message to store immediately
      const userMsg: Message = {
        id: makeId(),
        role: 'user',
        content,
        files,
        timestamp: Date.now(),
      }
      addMessage(userMsg)

      // Reset current assistant message tracker
      currentMsgIdRef.current = null

      wsRef.current.send(JSON.stringify({ content, files }))
    },
    [addMessage]
  )

  return { status, sendMessage }
}
