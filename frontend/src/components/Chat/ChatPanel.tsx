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
