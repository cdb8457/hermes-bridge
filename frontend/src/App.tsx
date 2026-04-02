import { useCallback, useMemo, useState } from 'react'
import { Header } from './components/Header/Header'
import { SessionList } from './components/Sidebar/SessionList'
import { CronPanel } from './components/Sidebar/CronPanel'
import { ChatPanel } from './components/Chat/ChatPanel'
import { MissionControl, type AgentStatus } from './components/Dashboard/MissionControl'
import { useChatStore } from './stores/chatStore'
import { useSessionStore } from './stores/sessionStore'
import { useVoiceOutput } from './hooks/useVoiceOutput'
import { api } from './lib/api'

function makeSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [sessionId, setSessionId] = useState<string>(() => makeSessionId())
  const [connected, setConnected] = useState(false)
  const [cronOpen, setCronOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [readingMessageId] = useState<string | null>(null)

  const clearMessages = useChatStore((s) => s.clearMessages)
  const loadMessages = useChatStore((s) => s.loadMessages)
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const { addSession, updateSession, setActiveSession } = useSessionStore()
  const { enabled: voiceEnabled, speak, toggle: toggleVoice } = useVoiceOutput()

  // Derive agent status for Mission Control
  const agentStatus = useMemo((): AgentStatus => {
    if (!isStreaming) return 'idle'
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.toolCalls?.some((tc) => tc.running)) return 'running'
    if (lastMsg?.thinking && lastMsg.thinking.length > 0 && !lastMsg.content) return 'thinking'
    return 'streaming'
  }, [isStreaming, messages])

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
      } catch {}
    },
    [clearMessages, loadMessages]
  )

  const handleFirstMessage = useCallback(
    (title: string) => {
      addSession({ id: sessionId, title, createdAt: Date.now(), updatedAt: Date.now() })
      setActiveSession(sessionId)
      updateSession(sessionId, { title })
    },
    [sessionId, addSession, setActiveSession, updateSession]
  )

  // Session branching — fork at a message index
  const handleBranch = useCallback(
    (messageIndex: number) => {
      const branchMessages = messages.slice(0, messageIndex + 1)
      const original = useSessionStore.getState().sessions.find(
        (s) => s.id === useSessionStore.getState().activeSessionId
      )
      const branchTitle = `Branch of ${original?.title ?? 'chat'}`
      const newId = makeSessionId()

      // Add branched session to sidebar
      addSession({
        id: newId,
        title: branchTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        parentId: sessionId,
        branchPoint: messageIndex,
      })

      // Switch to new session with copied messages
      setSessionId(newId)
      setActiveSession(newId)
      loadMessages(branchMessages.map((m) => ({ ...m })))
    },
    [messages, sessionId, addSession, setActiveSession, loadMessages]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <Header
        connected={connected}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={toggleVoice}
        onCronToggle={() => setCronOpen((v) => !v)}
        cronOpen={cronOpen}
        onDashboardToggle={() => setDashboardOpen((v) => !v)}
        dashboardOpen={dashboardOpen}
      />

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
            onBranch={handleBranch}
            voiceEnabled={voiceEnabled}
            speak={speak}
            readingMessageId={readingMessageId}
          />
        </main>

        {cronOpen && (
          <CronPanel onClose={() => setCronOpen(false)} />
        )}

        {dashboardOpen && (
          <MissionControl
            onClose={() => setDashboardOpen(false)}
            sessionId={sessionId}
            agentStatus={agentStatus}
          />
        )}
      </div>
    </div>
  )
}
