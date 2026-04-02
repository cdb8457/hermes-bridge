import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolCall } from '../../stores/chatStore'

interface ToolCallCardProps {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = toolCall.running && !toolCall.result
  const isDone = toolCall.result !== undefined

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${isRunning ? 'var(--accent-orange)' : 'var(--border-bright)'}`,
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: "'Geist Mono', monospace",
        fontSize: 12,
        transition: 'border-color 0.3s',
        opacity: isDone && !expanded ? 0.75 : 1,
      }}
    >
      {/* Header */}
      <button
        onClick={() => isDone && setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'none',
          border: 'none',
          cursor: isDone ? 'pointer' : 'default',
          color: isRunning ? 'var(--accent-orange)' : 'var(--text-secondary)',
          textAlign: 'left',
        }}
      >
        {/* Expand chevron — only when done */}
        {isDone ? (
          expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
        ) : (
          <span style={{ width: 11, display: 'inline-block' }} />
        )}

        {/* Tool name */}
        <span style={{ fontWeight: 500, color: isRunning ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
          ⚙ {toolCall.name}
        </span>

        {/* Status badge */}
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>
          {isRunning && (
            <span
              style={{
                color: 'var(--accent-orange)',
                animation: 'pulse-orange 1.2s ease-in-out infinite',
              }}
            >
              ◌ running
            </span>
          )}
          {isDone && (
            <span style={{ color: 'var(--status-success)' }}>
              ✓ done
            </span>
          )}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && isDone && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 10, letterSpacing: '0.05em' }}>
              INPUT
            </div>
            <pre
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 11,
              }}
            >
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 10, letterSpacing: '0.05em' }}>
              OUTPUT
            </div>
            <pre
              style={{
                margin: 0,
                color: 'var(--text-code)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 11,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {toolCall.result}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
