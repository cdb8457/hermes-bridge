import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ThinkingBlockProps {
  lines: string[]
}

export function ThinkingBlock({ lines }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (lines.length === 0) return null

  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--thinking-border)',
        background: 'var(--thinking-bg)',
        maxWidth: 680,
        width: '100%',
      }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: 'var(--thinking-label)', fontSize: 10, fontFamily: "'Geist Mono', monospace" }}>
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
        <span
          style={{
            color: 'var(--thinking-label)',
            fontSize: 10,
            fontFamily: "'Geist Mono', monospace",
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'lowercase',
          }}
        >
          thinking
        </span>
        {!expanded && (
          <span style={{ color: 'var(--thinking-text)', fontSize: 10, fontFamily: "'Geist Mono', monospace", marginLeft: 4 }}>
            {lines.length} line{lines.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--thinking-border)',
            padding: '8px 12px',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                color: 'var(--thinking-text)',
                fontSize: 11,
                fontFamily: "'Geist Mono', monospace",
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
