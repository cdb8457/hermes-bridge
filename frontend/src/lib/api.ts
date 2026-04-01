const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface SessionSummary {
  id: string
  title: string
  created_at: number
  updated_at: number
}

export interface SessionDetail {
  id: string
  title: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp?: number
  }>
}

export interface UploadResult {
  path: string
  filename: string
  url: string
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () => req<{ status: string }>('/api/health'),

  sessions: {
    list: () => req<SessionSummary[]>('/api/sessions'),
    get: (id: string) => req<SessionDetail>(`/api/sessions/${id}`),
    delete: (id: string) =>
      req<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
  },

  upload: (file: File): Promise<UploadResult> => {
    const form = new FormData()
    form.append('file', file)
    return req<UploadResult>('/api/upload', { method: 'POST', body: form })
  },
}
