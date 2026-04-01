import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolCall } from '../../stores/chatStore'

interface ToolCallCardProps {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--accent-orange)',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: "'Geist Mono', monospace",
        fontSize: 12,
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--accent-orange)',
          textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span style={{ fontWeight: 500 }}>⚙ {toolCall.name}</span>
        {!expanded && !toolCall.result && (
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontFamily: "'Geist', sans-serif",
            }}
          >
            running…
          </span>
        )}
        {!expanded && toolCall.result && (
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--status-success)',
              fontSize: 11,
              fontFamily: "'Geist', sans-serif",
            }}
          >
            done
          </span>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>
              INPUT
            </div>
            <pre
              style={{
                margin: 0,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: 12,
              }}
            >
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>
                OUTPUT
              </div>
              <pre
                style={{
                  margin: 0,
                  color: 'var(--text-code)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontSize: 12,
                }}
              >
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
