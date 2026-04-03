import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { api, type MemorySession } from '../../lib/api'

type Tab = 'card' | 'context' | 'sessions'

interface MemoryPanelProps {
  onClose: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: '12px 0 6px',
      fontFamily: "'Geist Mono', monospace",
    }}>
      {children}
    </div>
  )
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const [tab, setTab] = useState<Tab>('card')
  const [card, setCard] = useState<Record<string, unknown> | null>(null)
  const [context, setContext] = useState<string | null>(null)
  const [sessions, setSessions] = useState<MemorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [cardRes, ctxRes, sessRes] = await Promise.allSettled([
        api.memory.card(),
        api.memory.context(),
        api.memory.sessions(),
      ])

      if (cardRes.status === 'fulfilled') setCard(cardRes.value as Record<string, unknown>)
      if (ctxRes.status === 'fulfilled') {
        const c = ctxRes.value
        setContext((c as { context?: string; content?: string }).context
          ?? (c as { context?: string; content?: string }).content
          ?? JSON.stringify(c, null, 2))
      }
      if (sessRes.status === 'fulfilled') {
        const s = sessRes.value
        setSessions(Array.isArray(s) ? s : ((s as { items?: MemorySession[] }).items ?? []))
      }
      setLastRefresh(Date.now())
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + 60s auto-refresh
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => clearInterval(timer)
  }, [refresh])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'card', label: 'Card' },
    { id: 'context', label: 'Context' },
    { id: 'sessions', label: 'Sessions' },
  ]

  return (
    <div style={{
      width: 300,
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 12px 0',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{
            flex: 1,
            color: 'var(--accent-gold)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Geist Mono', monospace",
          }}>
            Memory
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 4, marginRight: 4,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                cursor: 'pointer',
                color: tab === t.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                fontSize: 12,
                fontFamily: "'Geist Mono', monospace",
                padding: '4px 12px 8px',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>

        {/* Last refresh */}
        {lastRefresh > 0 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", marginBottom: 8 }}>
            updated {timeAgo(new Date(lastRefresh).toISOString())}
          </div>
        )}

        {/* Card tab */}
        {tab === 'card' && (
          <div>
            {!card ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {loading ? 'Loading…' : 'No card data yet. Chat with Hermes to build memory.'}
              </p>
            ) : (card as { error?: string }).error ? (
              <p style={{ color: 'var(--status-error)', fontSize: 12 }}>
                {(card as { error?: string }).error}
              </p>
            ) : (
              <div>
                <SectionLabel>Peer Card</SectionLabel>
                {Object.entries(card).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent-gold)', fontFamily: "'Geist Mono', monospace", minWidth: 80, flexShrink: 0, fontSize: 11 }}>
                      {key}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {typeof val === 'string' ? val : JSON.stringify(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Context tab */}
        {tab === 'context' && (
          <div>
            <SectionLabel>Injected Context</SectionLabel>
            {!context ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {loading ? 'Loading…' : 'No context yet.'}
              </p>
            ) : (
              <pre style={{
                fontSize: 11,
                fontFamily: "'Geist Mono', monospace",
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.5,
                margin: 0,
              }}>
                {context}
              </pre>
            )}
          </div>
        )}

        {/* Sessions tab */}
        {tab === 'sessions' && (
          <div>
            <SectionLabel>Honcho Sessions ({sessions.length})</SectionLabel>
            {sessions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {loading ? 'Loading…' : 'No sessions yet.'}
              </p>
            ) : (
              sessions.map((s) => (
                <div key={s.id} style={{
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontFamily: "'Geist Mono', monospace", marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.id}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {s.updated_at ? timeAgo(s.updated_at) : s.created_at ? timeAgo(s.created_at) : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
