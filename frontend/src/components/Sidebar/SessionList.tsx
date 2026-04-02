import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { useChatStore } from '../../stores/chatStore'
import { api } from '../../lib/api'

interface SessionListProps {
  onNewChat: () => void
  onSelectSession: (id: string) => void
}

export function SessionList({ onNewChat, onSelectSession }: SessionListProps) {
  const { sessions, activeSessionId, setSessions, removeSession, setActiveSession } =
    useSessionStore()

  useEffect(() => {
    api.sessions
      .list()
      .then((data) =>
        setSessions(
          data.map((s) => ({
            id: s.id,
            title: s.title,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          }))
        )
      )
      .catch(() => {})
  }, [setSessions])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    try {
      await api.sessions.delete(id)
      removeSession(id)
      if (activeSessionId === id) useChatStore.getState().clearMessages()
    } catch {}
  }

  return (
    <aside
      style={{
        width: 240,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* New chat button — gold */}
      <div style={{ padding: '12px 12px 8px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--accent-gold-glow)',
            border: '1px solid var(--accent-gold-dim)',
            borderRadius: 8,
            color: 'var(--accent-gold)',
            fontWeight: 500,
            fontSize: 13,
            fontFamily: "'Geist', sans-serif",
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'rgba(212,160,23,0.2)'
            b.style.borderColor = 'var(--accent-gold)'
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'var(--accent-gold-glow)'
            b.style.borderColor = 'var(--accent-gold-dim)'
          }}
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        {sessions.length === 0 && (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            padding: '12px 8px',
            textAlign: 'center',
            fontFamily: "'Geist Mono', monospace",
          }}>
            no sessions yet
          </p>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          return (
            <div
              key={session.id}
              onClick={() => {
                setActiveSession(session.id)
                onSelectSession(session.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: isActive ? 'var(--accent-gold-glow)' : 'transparent',
                borderLeft: isActive
                  ? '2px solid var(--accent-gold)'
                  : '2px solid transparent',
                marginBottom: 2,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.title || 'Untitled'}
              </span>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="delete-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0,
                  transition: 'opacity 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--status-error)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                }}
                title="Delete session"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <style>{`div:hover .delete-btn { opacity: 1 !important; }`}</style>
    </aside>
  )
}
