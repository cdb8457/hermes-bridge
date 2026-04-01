import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useHermesChat } from '../../hooks/useHermesChat'
import { useFileUpload } from '../../hooks/useFileUpload'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'
import { FileDropZone } from './FileDropZone'

interface ChatPanelProps {
  sessionId: string | null
  onConnectionChange?: (connected: boolean) => void
  onFirstMessage?: (text: string) => void
}

export function ChatPanel({ sessionId, onConnectionChange, onFirstMessage }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const pendingFilePaths = useChatStore((s) => s.pendingFiles)
  const clearPendingFiles = useChatStore((s) => s.clearPendingFiles)
  const removePendingFile = useChatStore((s) => s.removePendingFile)

  const { status, sendMessage } = useHermesChat(sessionId)
  const { uploadFile } = useFileUpload()

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track uploaded file metadata for previews
  const uploadedMeta = useRef<Map<string, { name: string; previewUrl?: string }>>(
    new Map()
  )

  // Notify parent of connection status changes
  useEffect(() => {
    onConnectionChange?.(status === 'connected')
  }, [status, onConnectionChange])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    (text: string, files: string[]) => {
      if (!text && files.length === 0) return
      if (messages.length === 0 && text) {
        onFirstMessage?.(text.slice(0, 40))
      }
      sendMessage(text, files)
      clearPendingFiles()
      // Clean up preview URLs
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
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={() => {
          // Re-focus input on click anywhere in chat (helps WhisperFlow)
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
            <div style={{ fontSize: 48 }}>⚡</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hermes Bridge
            </div>
            <div style={{ fontSize: 14 }}>
              {status === 'connected'
                ? 'Connected — start typing or use WhisperFlow'
                : status === 'connecting'
                ? 'Connecting to Hermes…'
                : 'Disconnected — retrying…'}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} style={{ height: 24 }} />
      </div>

      {/* Input area */}
      <InputBar
        onSend={handleSend}
        disabled={isStreaming}
        pendingFiles={pendingFilesWithMeta}
        onRemoveFile={removePendingFile}
        onAttachFile={handleAttachClick}
      />

      {/* Hidden file input */}
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
