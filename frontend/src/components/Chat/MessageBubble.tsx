import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { GitBranch } from 'lucide-react'
import type { Message } from '../../stores/chatStore'
import { ToolCallCard } from './ToolCallCard'
import { ThinkingBlock } from './ThinkingBlock'

interface MessageBubbleProps {
  message: Message
  messageIndex: number
  onBranch?: (messageIndex: number) => void
  isReading?: boolean
}

export function MessageBubble({ message, messageIndex, onBranch, isReading }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 20,
        maxWidth: '100%',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thinking block */}
      {!isUser && message.thinking && message.thinking.length > 0 && (
        <ThinkingBlock lines={message.thinking} />
      )}

      {/* Tool calls */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 680, marginBottom: 8 }}>
          {message.toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      {/* File attachments */}
      {isUser && message.files && message.files.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
          {message.files.map((f) => (
            <span
              key={f}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-bright)',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {f.split('/').pop() ?? f}
            </span>
          ))}
        </div>
      )}

      {/* Message content */}
      {(message.content || message.streaming) && (
        <div style={{ position: 'relative', maxWidth: 680, width: isUser ? 'auto' : '100%' }}>
          <div
            style={
              isUser
                ? {
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: '12px 12px 4px 12px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }
                : {
                    borderLeft: isReading
                      ? '2px solid var(--accent-gold)'
                      : '2px solid var(--accent-gold)',
                    paddingLeft: 16,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    boxShadow: isReading
                      ? 'inset 3px 0 0 0 var(--accent-gold-glow)'
                      : 'none',
                    transition: 'box-shadow 0.3s',
                  }
            }
          >
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <div className="prose">
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {message.content}
                </ReactMarkdown>
                {message.streaming && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 14,
                      background: 'var(--accent-gold)',
                      marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'blink 1s step-end infinite',
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Branch button — appears on hover */}
          {hovered && !message.streaming && onBranch && (
            <button
              onClick={() => onBranch(messageIndex)}
              title="Branch conversation from here"
              style={{
                position: 'absolute',
                top: 6,
                right: isUser ? 'auto' : -28,
                left: isUser ? -28 : 'auto',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-bright)',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '3px 4px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.color = 'var(--accent-gold)'
                b.style.borderColor = 'var(--accent-gold-dim)'
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.color = 'var(--text-muted)'
                b.style.borderColor = 'var(--border-bright)'
              }}
            >
              <GitBranch size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
