import { useState, useEffect, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import { api, type AgentConfig, getApiBase, setApiBase } from '../../lib/api'

const KNOWN_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5',
  'claude-sonnet-4-5',
]

interface SettingsPanelProps {
  onClose: () => void
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 10,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 5,
      fontFamily: "'Geist Mono', monospace",
    }}>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-bright)',
  borderRadius: 5,
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: "'Geist Mono', monospace",
  padding: '6px 8px',
  outline: 'none',
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<AgentConfig>({})
  const [draft, setDraft] = useState<AgentConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiBase, setApiBaseDraft] = useState(() => getApiBase())
  const [apiBaseSaved, setApiBaseSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.config.get()
      setConfig(data)
      setDraft(data)
    } catch {
      // backend may not have /api/config yet — show empty form
      setConfig({})
      setDraft({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.config.set(draft)
      setConfig(updated)
      setDraft(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        width: 300,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 12px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          flex: 1,
          color: 'var(--accent-gold)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Geist Mono', monospace",
        }}>
          Settings
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: "'Geist Mono', monospace" }}>loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Model */}
            <div>
              <FieldLabel>Model</FieldLabel>
              <select
                value={draft.model ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value || undefined }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— default —</option>
                {KNOWN_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {draft.model && !KNOWN_MODELS.includes(draft.model) && (
                  <option value={draft.model}>{draft.model}</option>
                )}
              </select>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                Sent to Hermes on every new session.
              </p>
            </div>

            {/* Workspace */}
            <div>
              <FieldLabel>Workspace path</FieldLabel>
              <input
                type="text"
                value={draft.workspace ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, workspace: e.target.value || undefined }))}
                placeholder="/home/user/projects/myproject"
                style={inputStyle}
              />
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                Working directory Hermes uses when running tools.
              </p>
            </div>

            {/* Raw JSON for any other keys */}
            {Object.keys(config).filter((k) => k !== 'model' && k !== 'workspace').length > 0 && (
              <div>
                <FieldLabel>Other config</FieldLabel>
                <pre style={{
                  margin: 0,
                  fontSize: 10,
                  fontFamily: "'Geist Mono', monospace",
                  color: 'var(--text-secondary)',
                  background: 'var(--thinking-bg)',
                  border: '1px solid var(--thinking-border)',
                  borderRadius: 4,
                  padding: '6px 8px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {JSON.stringify(
                    Object.fromEntries(Object.entries(config).filter(([k]) => k !== 'model' && k !== 'workspace')),
                    null, 2
                  )}
                </pre>
              </div>
            )}

            {/* API base URL */}
            <div>
              <FieldLabel>API base URL</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={apiBase}
                  onChange={(e) => { setApiBaseDraft(e.target.value); setApiBaseSaved(false) }}
                  placeholder="http://localhost:8642  (leave blank = same-origin)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    setApiBase(apiBase.trim())
                    setApiBaseSaved(true)
                    setTimeout(() => setApiBaseSaved(false), 2000)
                  }}
                  style={{
                    background: apiBaseSaved ? 'var(--status-success)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 5,
                    cursor: 'pointer',
                    color: apiBaseSaved ? '#000' : 'var(--text-secondary)',
                    padding: '0 10px',
                    fontSize: 11,
                    fontFamily: "'Geist Mono', monospace",
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  {apiBaseSaved ? 'saved' : 'apply'}
                </button>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                Stored in localStorage. Overrides the build-time env. Takes effect immediately.
              </p>
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--status-error)' }}>{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Footer — save button */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: isDirty && !saving ? 'var(--accent-gold)' : 'var(--bg-hover)',
            border: 'none',
            borderRadius: 6,
            cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
            color: isDirty && !saving ? '#000' : 'var(--text-muted)',
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <Save size={12} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
