import { Settings, Volume2, VolumeX, Clock, LayoutDashboard, Brain, Zap } from 'lucide-react'

interface HeaderProps {
  connected: boolean
  model?: string
  voiceEnabled?: boolean
  onVoiceToggle?: () => void
  onCronToggle?: () => void
  cronOpen?: boolean
  onDashboardToggle?: () => void
  dashboardOpen?: boolean
  onMemoryToggle?: () => void
  memoryOpen?: boolean
  onSkillsToggle?: () => void
  skillsOpen?: boolean
  onSettingsToggle?: () => void
  settingsOpen?: boolean
}

export function Header({
  connected,
  model = 'hermes',
  voiceEnabled = false,
  onVoiceToggle,
  onCronToggle,
  cronOpen = false,
  onDashboardToggle,
  dashboardOpen = false,
  onMemoryToggle,
  memoryOpen = false,
  onSkillsToggle,
  skillsOpen = false,
  onSettingsToggle,
  settingsOpen = false,
}: HeaderProps) {
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
          color: 'var(--accent-gold)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.3px',
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        ⚕ Hermes Bridge
      </span>

      {/* Center: model name */}
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

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Voice toggle */}
        <button
          onClick={onVoiceToggle}
          title={voiceEnabled ? 'Voice on — click to mute' : 'Voice off — click to enable'}
          style={{
            background: voiceEnabled ? 'var(--accent-gold-glow)' : 'none',
            border: voiceEnabled ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: voiceEnabled ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!voiceEnabled)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!voiceEnabled)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        {/* Cron panel toggle */}
        <button
          onClick={onCronToggle}
          title="Scheduled tasks"
          style={{
            background: cronOpen ? 'var(--accent-gold-glow)' : 'none',
            border: cronOpen ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: cronOpen ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!cronOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!cronOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <Clock size={15} />
        </button>

        {/* Memory toggle */}
        <button
          onClick={onMemoryToggle}
          title="Memory Viewer"
          style={{
            background: memoryOpen ? 'var(--accent-gold-glow)' : 'none',
            border: memoryOpen ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: memoryOpen ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!memoryOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!memoryOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <Brain size={15} />
        </button>

        {/* Dashboard toggle */}
        <button
          onClick={onDashboardToggle}
          title="Mission Control"
          style={{
            background: dashboardOpen ? 'var(--accent-gold-glow)' : 'none',
            border: dashboardOpen ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: dashboardOpen ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!dashboardOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!dashboardOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <LayoutDashboard size={15} />
        </button>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
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

        {/* Skills toggle */}
        <button
          onClick={onSkillsToggle}
          title="Skills"
          style={{
            background: skillsOpen ? 'var(--accent-gold-glow)' : 'none',
            border: skillsOpen ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: skillsOpen ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!skillsOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!skillsOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <Zap size={15} />
        </button>

        {/* Settings toggle */}
        <button
          onClick={onSettingsToggle}
          title="Settings"
          style={{
            background: settingsOpen ? 'var(--accent-gold-glow)' : 'none',
            border: settingsOpen ? '1px solid var(--accent-gold-dim)' : '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            color: settingsOpen ? 'var(--accent-gold)' : 'var(--text-muted)',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!settingsOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            if (!settingsOpen)
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  )
}
