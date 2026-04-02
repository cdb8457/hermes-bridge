import { Settings } from 'lucide-react'

interface HeaderProps {
  connected: boolean
  model?: string
}

export function Header({ connected, model = 'hermes' }: HeaderProps) {
  return (
    <header
      style={{
        height: 48,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Left: wordmark — gold, matching CLI */}
      <span
        style={{
          color: 'var(--accent-gold)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.3px',
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        ⚕ Hermes Bridge
      </span>

      {/* Center: model name — cyan, matching CLI status bar */}
      <span
        style={{
          flex: 1,
          textAlign: 'center',
          color: 'var(--accent-cyan)',
          fontSize: 12,
          fontFamily: "'Geist Mono', monospace",
          opacity: 0.9,
        }}
      >
        {model}
      </span>

      {/* Right: status dot + settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: connected ? 'var(--status-success)' : 'var(--status-error)',
              boxShadow: connected ? '0 0 6px var(--status-success)' : 'none',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>
            {connected ? 'connected' : 'disconnected'}
          </span>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
          title="Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  )
}
