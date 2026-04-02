import { useRef, useState } from 'react'
import { Send, Paperclip, X } from 'lucide-react'

interface PendingFile {
  path: string
  name: string
  previewUrl?: string
}

interface InputBarProps {
  onSend: (message: string, files: string[]) => void
  disabled?: boolean
  pendingFiles?: PendingFile[]
  onRemoveFile?: (path: string) => void
  onAttachFile?: () => void
}

export function InputBar({
  onSend,
  disabled = false,
  pendingFiles = [],
  onRemoveFile,
  onAttachFile,
}: InputBarProps) {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed && pendingFiles.length === 0) return
    onSend(trimmed, pendingFiles.map((f) => f.path))
    setMessage('')
    // Critical: re-focus immediately for next WhisperFlow dictation
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '12px 16px',
      }}
    >
      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {pendingFiles.map((f) => (
            <div
              key={f.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-bright)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                maxWidth: 200,
              }}
            >
              {f.previewUrl ? (
                <img
                  src={f.previewUrl}
                  alt={f.name}
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: 'cover',
                    borderRadius: 3,
                  }}
                />
              ) : null}
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.name}
              </span>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(f.path)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)',
          borderRadius: 12,
          padding: '8px 12px',
          transition: 'border-color 0.15s',
        }}
        onFocusCapture={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor =
            'var(--accent-cyan-dim)'
        }}
        onBlurCapture={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor =
            'var(--border-bright)'
        }}
      >
        {/* Attach button */}
        <button
          onClick={onAttachFile}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>

        {/* CRITICAL: native <textarea> for WhisperFlow compatibility — never disabled so voice input always works */}
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Hermes is thinking…' : 'Message Hermes...'}
          autoFocus
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontFamily: "'Geist', system-ui, sans-serif",
            lineHeight: '1.5',
            maxHeight: 200,
            overflowY: 'auto',
            fieldSizing: 'content',
          } as React.CSSProperties}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && pendingFiles.length === 0)}
          style={{
            background:
              disabled || (!message.trim() && pendingFiles.length === 0)
                ? 'var(--bg-hover)'
                : 'var(--accent-cyan)',
            border: 'none',
            borderRadius: 8,
            cursor:
              disabled || (!message.trim() && pendingFiles.length === 0)
                ? 'not-allowed'
                : 'pointer',
            color:
              disabled || (!message.trim() && pendingFiles.length === 0)
                ? 'var(--text-muted)'
                : '#000',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          title="Send (Enter)"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
