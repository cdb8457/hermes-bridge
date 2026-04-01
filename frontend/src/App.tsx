import { useCallback, useState } from 'react'
import { Header } from './components/Header/Header'
import { SessionList } from './components/Sidebar/SessionList'
import { ChatPanel } from './components/Chat/ChatPanel'
import { useChatStore } from './stores/chatStore'
import { useSessionStore } from './stores/sessionStore'
import { api } from './lib/api'

function makeSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId())
  const [connected, setConnected] = useState(false)

  const clearMessages = useChatStore((s) => s.clearMessages)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const { addSession, updateSession, setActiveSession } = useSessionStore()

  const handleNewChat = useCallback(() => {
    const newId = makeSessionId()
    setSessionId(newId)
    clearMessages()
    setActiveSession(null)
  }, [clearMessages, setActiveSession])

  const handleSelectSession = useCallback(
    async (id: string) => {
      setSessionId(id)
      clearMessages()
      try {
        const detail = await api.sessions.get(id)
        loadMessages(
          detail.messages.map((m, i) => ({
            id: `${id}_${i}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ?? Date.now(),
          }))
        )
      } catch {
        // Session history unavailable
      }
    },
    [clearMessages, loadMessages]
  )

  const handleFirstMessage = useCallback(
    (title: string) => {
      addSession({
        id: sessionId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setActiveSession(sessionId)
      updateSession(sessionId, { title })
    },
    [sessionId, addSession, setActiveSession, updateSession]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <Header connected={connected} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SessionList
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatPanel
            sessionId={sessionId}
            onConnectionChange={setConnected}
            onFirstMessage={handleFirstMessage}
          />
        </main>
      </div>
    </div>
  )
}
