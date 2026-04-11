import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Play, ChevronDown, ChevronRight } from 'lucide-react'
import { api, type Skill } from '../../lib/api'

interface SkillsPanelProps {
  onClose: () => void
  onRunSkill?: (skillName: string) => void
}

function SkillRow({ skill, onRun }: { skill: Skill; onRun: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Row header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 8px',
          cursor: 'pointer',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: 'var(--accent-gold)',
            fontFamily: "'Geist Mono', monospace",
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {skill.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRun(skill.name) }}
          title={`Run /${skill.name}`}
          style={{
            background: 'none',
            border: '1px solid var(--border-bright)',
            borderRadius: 4,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '2px 5px',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            flexShrink: 0,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.color = 'var(--accent-cyan)'
            b.style.borderColor = 'var(--accent-cyan-dim)'
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.color = 'var(--text-muted)'
            b.style.borderColor = 'var(--border-bright)'
          }}
        >
          <Play size={9} />
          run
        </button>
      </div>

      {/* Expanded: description + content */}
      {expanded && (
        <div style={{ padding: '0 10px 10px 24px' }}>
          {skill.description && (
            <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {skill.description}
            </p>
          )}
          {skill.content && (
            <pre
              style={{
                margin: 0,
                fontSize: 10,
                fontFamily: "'Geist Mono', monospace",
                color: 'var(--thinking-text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--thinking-bg)',
                border: '1px solid var(--thinking-border)',
                borderRadius: 4,
                padding: '6px 8px',
                maxHeight: 200,
                overflowY: 'auto',
                lineHeight: 1.5,
              }}
            >
              {skill.content}
            </pre>
          )}
          {!skill.description && !skill.content && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>
              no detail available
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function SkillsPanel({ onClose, onRunSkill }: SkillsPanelProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [lastRefresh, setLastRefresh] = useState(0)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.skills.list()
      setSkills(Array.isArray(data) ? data : [])
      setLastRefresh(Date.now())
    } catch {
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const filtered = filter.trim()
    ? skills.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()) || s.description?.toLowerCase().includes(filter.toLowerCase()))
    : skills

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
      {/* Header */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            flex: 1,
            color: 'var(--accent-gold)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Geist Mono', monospace",
          }}>
            Skills
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: "'Geist Mono', monospace", marginRight: 6 }}>
            {skills.length}
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, marginRight: 2 }}
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

        {/* Filter */}
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter skills…"
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-bright)',
            borderRadius: 5,
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: "'Geist Mono', monospace",
            padding: '5px 8px',
            outline: 'none',
          }}
        />
      </div>

      {/* Last refresh */}
      {lastRefresh > 0 && (
        <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", flexShrink: 0 }}>
          {filtered.length} skill{filtered.length !== 1 ? 's' : ''}{filter ? ' matched' : ''}
        </div>
      )}

      {/* Skill list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && skills.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 16, fontFamily: "'Geist Mono', monospace" }}>
            loading…
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 16, fontFamily: "'Geist Mono', monospace" }}>
            {filter ? 'no matches' : 'no skills found'}
          </p>
        ) : (
          filtered.map((skill) => (
            <SkillRow
              key={skill.name}
              skill={skill}
              onRun={(name) => onRunSkill?.(name)}
            />
          ))
        )}
      </div>
    </div>
  )
}
