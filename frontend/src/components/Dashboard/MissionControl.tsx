import { useMemo, useRef, useEffect, Fragment } from 'react'
import { X } from 'lucide-react'
import { useActivityStore, type ActivityEvent } from '../../stores/activityStore'
import { useChatStore } from '../../stores/chatStore'

export type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'running'

interface MissionControlProps {
  onClose: () => void
  sessionId: string
  agentStatus: AgentStatus
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; symbol: string }> = {
  idle:      { label: 'Idle',         color: 'var(--status-success)', symbol: '◉' },
  thinking:  { label: 'Thinking',     color: 'var(--accent-gold)',    symbol: '💭' },
  streaming: { label: 'Responding',   color: 'var(--accent-cyan)',    symbol: '◎' },
  running:   { label: 'Running Tool', color: 'var(--status-warning)', symbol: '⚙' },
}

const EVENT_COLOR: Record<ActivityEvent['type'], string> = {
  thinking:     'var(--accent-gold)',
  tool_call:    'var(--status-warning)',
  tool_result:  'var(--text-muted)',
  response:     'var(--status-success)',
  user_message: 'var(--accent-cyan)',
}

const EVENT_ICON: Record<ActivityEvent['type'], string> = {
  thinking:     '💭',
  tool_call:    '⚙',
  tool_result:  '←',
  response:     '◉',
  user_message: '→',
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      margin: '14px 0 6px',
      fontFamily: "'Geist Mono', monospace",
    }}>
      {children}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function MissionControl({ onClose, sessionId, agentStatus }: MissionControlProps) {
  const allEvents = useActivityStore((s) => s.events)
  const messages = useChatStore((s) => s.messages)

  // Filter events to current session
  const events = useMemo(
    () => allEvents.filter((e) => e.sessionId === sessionId),
    [allEvents, sessionId]
  )

  // Session stats
  const stats = useMemo(() => {
    const assistant = messages.filter((m) => m.role === 'assistant')
    const toolCalls = assistant.reduce((n, m) => n + (m.toolCalls?.length ?? 0), 0)
    const thinkingBlocks = assistant.filter((m) => m.thinking && m.thinking.length > 0).length
    return { messages: messages.length, toolCalls, thinkingBlocks }
  }, [messages])

  // Tool usage counts
  const toolCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    messages.forEach((m) => {
      m.toolCalls?.forEach((tc) => {
        counts[tc.name] = (counts[tc.name] ?? 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [messages])

  const maxToolCount = toolCounts[0]?.[1] ?? 1

  // Auto-scroll feed to top when new events arrive
  const feedRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(events.length)
  useEffect(() => {
    if (events.length > prevLen.current && feedRef.current) {
      feedRef.current.scrollTop = 0
    }
    prevLen.current = events.length
  }, [events.length])

  const { label: statusLabel, color: statusColor, symbol: statusSymbol } = STATUS_CONFIG[agentStatus]

  return (
    <div
      style={{
        width: 280,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          flex: 1,
          color: 'var(--accent-gold)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Geist Mono', monospace",
        }}>
          Mission Control
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>

        {/* Status */}
        <SectionLabel>Status</SectionLabel>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 13,
          fontWeight: 600,
          color: statusColor,
          fontFamily: "'Geist Mono', monospace",
        }}>
          <span style={{ fontSize: 15 }}>{statusSymbol}</span>
          {statusLabel}
        </div>

        {/* Session stats */}
        <SectionLabel>Session Stats</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr', gap: '3px 8px', fontSize: 12 }}>
          {[
            { n: stats.messages,       label: 'messages' },
            { n: stats.toolCalls,      label: 'tool calls' },
            { n: stats.thinkingBlocks, label: 'thinking blocks' },
          ].map(({ n, label }) => (
            <Fragment key={label}>
              <span style={{ color: 'var(--accent-gold)', fontFamily: "'Geist Mono', monospace", fontWeight: 700, textAlign: 'right' }}>
                {n}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </Fragment>
          ))}
        </div>

        {/* Top tools */}
        {toolCounts.length > 0 && (
          <>
            <SectionLabel>Top Tools</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {toolCounts.map(([name, count]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11 }}>
                  <span style={{ width: 90, color: 'var(--text-secondary)', fontFamily: "'Geist Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </span>
                  <div style={{ flex: 1, height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round((count / maxToolCount) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-gold)',
                      opacity: 0.7,
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", minWidth: 16, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Activity feed */}
        <SectionLabel>Activity Feed</SectionLabel>
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>
            no activity yet
          </p>
        ) : (
          <div ref={feedRef} style={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  padding: '4px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", flexShrink: 0, minWidth: 54, marginTop: 1 }}>
                  {timeAgo(evt.timestamp)}
                </span>
                <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                  {EVENT_ICON[evt.type]}
                </span>
                <span style={{ fontSize: 11, color: EVENT_COLOR[evt.type], lineHeight: 1.4, wordBreak: 'break-all' }}>
                  {evt.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
