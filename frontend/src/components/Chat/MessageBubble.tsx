import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import type { Message } from '../../stores/chatStore'
import { ToolCallCard } from './ToolCallCard'
import { ThinkingBlock } from './ThinkingBlock'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 20,
        maxWidth: '100%',
      }}
    >
      {/* Thinking block — assistant only, above everything */}
      {!isUser && message.thinking && message.thinking.length > 0 && (
        <ThinkingBlock lines={message.thinking} />
      )}

      {/* Tool calls */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            width: '100%',
            maxWidth: 680,
            marginBottom: 8,
          }}
        >
          {message.toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      {/* File attachments (user messages) */}
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
        <div
          style={
            isUser
              ? {
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-bright)',
                  borderRadius: '12px 12px 4px 12px',
                  padding: '10px 14px',
                  maxWidth: 640,
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }
              : {
                  borderLeft: '2px solid var(--accent-gold)',
                  paddingLeft: 16,
                  maxWidth: 680,
                  width: '100%',
                  color: 'var(--text-primary)',
                  fontSize: 14,
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
      )}
    </div>
  )
}
