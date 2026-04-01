import { useCallback, useState } from 'react'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/zip',
]

interface FileDropZoneProps {
  onFileDrop: (files: File[]) => void
  children: React.ReactNode
}

export function FileDropZone({ onFileDrop, children }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the root drop zone, not a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      )
      if (files.length > 0) onFileDrop(files)
    },
    [onFileDrop]
  )

  return (
    <div
      style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--accent-cyan-glow)',
            border: '2px dashed var(--accent-cyan)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              color: 'var(--accent-cyan)',
              fontSize: 18,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Drop file to attach
          </div>
        </div>
      )}
    </div>
  )
}
