import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'

export interface PaletteCommand {
  id: string
  label: string
  description?: string
  category: 'session' | 'action' | 'skill' | 'nav'
  icon?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  extraCommands?: PaletteCommand[]
}

const CATEGORY_ORDER: PaletteCommand['category'][] = ['action', 'session', 'skill', 'nav']
const CATEGORY_LABEL: Record<PaletteCommand['category'], string> = {
  action: 'Actions',
  session: 'Sessions',
  skill: 'Skills',
  nav: 'Navigation',
}

export function CommandPalette({ open, onClose, extraCommands = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const sessions = useSessionStore((s) => s.sessions)
  const setActiveSession = useSessionStore((s) => s.setActiveSession)

  // Build the full command list
  const commands = useMemo((): PaletteCommand[] => {
    const sessionCmds: PaletteCommand[] = sessions.map((s) => ({
      id: `session:${s.id}`,
      label: s.title || 'Untitled',
      description: s.id,
      category: 'session',
      icon: '💬',
      action: () => {
        setActiveSession(s.id)
        window.dispatchEvent(new CustomEvent('hermes:select-session', { detail: s.id }))
      },
    }))
    return [...extraCommands, ...sessionCmds]
  }, [sessions, extraCommands, setActiveSession])

  // Filter
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q ? commands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category.includes(q)
    ) : commands
  }, [commands, query])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<PaletteCommand['category'], PaletteCommand[]>()
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, [])
      map.get(cmd.category)!.push(cmd)
    }
    // Flatten in category order for keyboard nav
    const flat: Array<PaletteCommand | { _header: string }> = []
    for (const cat of CATEGORY_ORDER) {
      const items = map.get(cat)
      if (items?.length) {
        flat.push({ _header: CATEGORY_LABEL[cat] })
        flat.push(...items)
      }
    }
    return flat
  }, [filtered])

  // Only actual commands for keyboard nav
  const navItems = useMemo(() =>
    grouped.filter((item): item is PaletteCommand => !('_header' in item)),
  [grouped])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset cursor when filtered list changes
  useEffect(() => { setCursor(0) }, [filtered])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cursor="true"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const execute = useCallback((cmd: PaletteCommand) => {
    cmd.action()
    onClose()
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, navItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = navItems[cursor]
      if (cmd) execute(cmd)
    }
  }

  if (!open) return null

  // Map navItems index → position in grouped for rendering
  let navIdx = -1

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxHeight: '60vh',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions, actions, skills…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: "'Geist', sans-serif",
            }}
          />
          <kbd style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-bright)',
            borderRadius: 4,
            padding: '2px 5px',
            fontFamily: "'Geist Mono', monospace",
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {grouped.length === 0 ? (
            <p style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              padding: '24px 0',
              fontFamily: "'Geist Mono', monospace",
            }}>
              no results
            </p>
          ) : (
            grouped.map((item, i) => {
              if ('_header' in item) {
                return (
                  <div
                    key={`header-${i}`}
                    style={{
                      padding: '8px 16px 4px',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {item._header}
                  </div>
                )
              }
              navIdx++
              const isActive = navIdx === cursor
              const idx = navIdx
              return (
                <div
                  key={item.id}
                  data-cursor={isActive ? 'true' : undefined}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setCursor(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-gold-glow)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--accent-gold)' : '2px solid transparent',
                    transition: 'background 0.08s',
                  }}
                >
                  {item.icon && (
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.label}
                    </div>
                    {item.description && (
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        fontFamily: "'Geist Mono', monospace",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <kbd style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-bright)',
                      borderRadius: 4,
                      padding: '2px 5px',
                      fontFamily: "'Geist Mono', monospace",
                      flexShrink: 0,
                    }}>
                      ↵
                    </kbd>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 14,
          flexShrink: 0,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, hint]) => (
            <span key={key} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'center' }}>
              <kbd style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-bright)',
                borderRadius: 3,
                padding: '1px 4px',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
              }}>{key}</kbd>
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
