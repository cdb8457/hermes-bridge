import { useCallback } from 'react'
import { useChatStore } from '../stores/chatStore'
import { api } from '../lib/api'

export interface UploadedFile {
  path: string
  name: string
  previewUrl?: string
}

export function useFileUpload() {
  const { addPendingFile, removePendingFile, clearPendingFiles, pendingFiles } =
    useChatStore()

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      try {
        const result = await api.upload(file)
        let previewUrl: string | undefined
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file)
        }
        addPendingFile(result.path)
        return { path: result.path, name: file.name, previewUrl }
      } catch (err) {
        console.error('Upload failed:', err)
        return null
      }
    },
    [addPendingFile]
  )

  return { uploadFile, pendingFiles, removePendingFile, clearPendingFiles }
}
