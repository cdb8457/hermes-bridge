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
      {/* Left: wordmark */}
      <span
        style={{
          color: 'var(--accent-cyan)',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.3px',
        }}
      >
        Hermes Bridge
      </span>

      {/* Center: model */}
      <span
        style={{
          flex: 1,
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        {model}
      </span>

      {/* Right: status + settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected
                ? 'var(--status-success)'
                : 'var(--status-error)',
              boxShadow: connected
                ? '0 0 6px var(--status-success)'
                : 'none',
            }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
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
          }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
