import { useEffect, useRef, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useHermesChat } from '../../hooks/useHermesChat'
import { useFileUpload } from '../../hooks/useFileUpload'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { FileDropZone } from './FileDropZone'

interface ChatPanelProps {
  sessionId: string | null
  onConnectionChange?: (connected: boolean) => void
  onFirstMessage?: (text: string) => void
  onBranch?: (messageIndex: number) => void
  voiceEnabled?: boolean
  speak?: (text: string) => void
  readingMessageId?: string | null
}

export function ChatPanel({
  sessionId,
  onConnectionChange,
  onFirstMessage,
  onBranch,
  voiceEnabled = false,
  speak,
  readingMessageId,
}: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const pendingFilePaths = useChatStore((s) => s.pendingFiles)
  const activeSession = useSessionStore((s) => s.sessions.find((ss) => ss.id === sessionId))
  const clearPendingFiles = useChatStore((s) => s.clearPendingFiles)
  const removePendingFile = useChatStore((s) => s.removePendingFile)

  const { status, sendMessage } = useHermesChat(sessionId)
  const { uploadFile } = useFileUpload()

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadedMeta = useRef<Map<string, { name: string; previewUrl?: string }>>(new Map())

  // Track which messages have already been spoken to avoid re-speaking
  const spokenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    onConnectionChange?.(status === 'connected')
  }, [status, onConnectionChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Speak completed assistant messages
  useEffect(() => {
    if (!voiceEnabled || !speak) return
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.role !== 'assistant') return
    if (last.streaming) return
    if (spokenIds.current.has(last.id)) return
    if (!last.content) return
    spokenIds.current.add(last.id)
    speak(last.content)
  }, [messages, voiceEnabled, speak])

  const handleSend = useCallback(
    (text: string, files: string[]) => {
      if (!text && files.length === 0) return
      if (messages.length === 0 && text) {
        onFirstMessage?.(text.slice(0, 40))
      }
      sendMessage(text, files)
      clearPendingFiles()
      uploadedMeta.current.clear()
    },
    [sendMessage, clearPendingFiles, messages.length, onFirstMessage]
  )

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const result = await uploadFile(file)
        if (result) {
          uploadedMeta.current.set(result.path, {
            name: result.name,
            previewUrl: result.previewUrl,
          })
        }
      }
    },
    [uploadFile]
  )

  const handleAttachClick = () => fileInputRef.current?.click()

  const handlePasteFile = useCallback(
    async (file: File) => {
      const result = await uploadFile(file)
      if (result) {
        uploadedMeta.current.set(result.path, {
          name: result.name,
          previewUrl: result.previewUrl,
        })
      }
    },
    [uploadFile]
  )

  const handleExport = useCallback((format: 'md' | 'json') => {
    const title = activeSession?.title ?? 'hermes-chat'
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    const filename = `${slug}.${format}`

    let content: string
    if (format === 'json') {
      content = JSON.stringify(
        { session: activeSession, messages: messages.map(({ id: _, streaming: __, ...m }) => m) },
        null, 2
      )
    } else {
      content = `# ${title}\n\n` +
        messages.map((m) => {
          const who = m.role === 'user' ? '**You**' : '**Hermes**'
          const ts = new Date(m.timestamp).toLocaleString()
          const thinking = m.thinking?.length
            ? `\n> *thinking (${m.thinking.length} lines)*\n`
            : ''
          return `${who} — ${ts}${thinking}\n\n${m.content}`
        }).join('\n\n---\n\n')
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, activeSession])

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) await handleFileDrop(files)
    e.target.value = ''
  }

  const pendingFilesWithMeta = pendingFilePaths.map((path) => ({
    path,
    name: uploadedMeta.current.get(path)?.name ?? path.split('/').pop() ?? path,
    previewUrl: uploadedMeta.current.get(path)?.previewUrl,
  }))

  return (
    <FileDropZone onFileDrop={handleFileDrop}>
      {/* Toolbar — only shown when there are messages */}
      {messages.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '6px 24px 0',
          gap: 4,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", marginRight: 4 }}>
            export
          </span>
          {(['md', 'json'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              title={`Download as .${fmt}`}
              style={{
                background: 'none',
                border: '1px solid var(--border-bright)',
                borderRadius: 4,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px 7px',
                fontSize: 10,
                fontFamily: "'Geist Mono', monospace",
                display: 'flex',
                alignItems: 'center',
                gap: 4,
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
              <Download size={9} />
              .{fmt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 40 }}>⚕</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-gold)', fontFamily: "'Geist Mono', monospace" }}>
              Hermes Bridge
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {status === 'connected'
                ? 'Connected — ready'
                : status === 'connecting'
                ? 'Connecting to Hermes…'
                : 'Disconnected — retrying…'}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            messageIndex={index}
            onBranch={onBranch}
            isReading={readingMessageId === msg.id}
          />
        ))}

        <div ref={bottomRef} style={{ height: 24 }} />
      </div>

      {/* Input */}
      <InputBar
        onSend={handleSend}
        disabled={isStreaming}
        pendingFiles={pendingFilesWithMeta}
        onRemoveFile={removePendingFile}
        onAttachFile={handleAttachClick}
        onPasteFile={handlePasteFile}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.json,.zip"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </FileDropZone>
  )
}
