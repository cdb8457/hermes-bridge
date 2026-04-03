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

export interface MemoryCard {
  content?: string
  [key: string]: unknown
}

export interface MemoryContext {
  context?: string
  content?: string
  [key: string]: unknown
}

export interface MemorySession {
  id: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface CronJob {
  id: string
  prompt: string
  schedule: string
  schedule_human: string
  active: boolean
  last_run?: string
  last_status?: 'success' | 'failed'
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

  memory: {
    card: () => req<MemoryCard>('/api/memory/card'),
    context: () => req<MemoryContext>('/api/memory/context'),
    sessions: () => req<{ items?: MemorySession[] } | MemorySession[]>('/api/memory/sessions', { method: 'POST' }),
  },

  cron: {
    list: () => req<CronJob[]>('/api/cron'),
    create: (prompt: string, schedule: string) =>
      req<CronJob>('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, schedule }),
      }),
    delete: (id: string) =>
      req<void>(`/api/cron/${id}`, { method: 'DELETE' }),
    pause: (id: string) =>
      req<void>(`/api/cron/${id}/pause`, { method: 'POST' }),
    resume: (id: string) =>
      req<void>(`/api/cron/${id}/resume`, { method: 'POST' }),
  },
}
