// Runtime base URL: localStorage override → build-time env → same-origin
const LS_KEY = 'hermes_api_base'

function getBase(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? import.meta.env.VITE_API_BASE_URL ?? ''
  } catch {
    return import.meta.env.VITE_API_BASE_URL ?? ''
  }
}

export function setApiBase(url: string): void {
  try {
    if (url) localStorage.setItem(LS_KEY, url.replace(/\/$/, ''))
    else localStorage.removeItem(LS_KEY)
  } catch {}
}

export function getApiBase(): string {
  return getBase()
}

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

export interface Skill {
  name: string
  description?: string
  content?: string
  path?: string
}

export interface AgentConfig {
  model?: string
  workspace?: string
  [key: string]: unknown
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () => req<{ status: string }>('/health'),

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

  skills: {
    list: () => req<Skill[]>('/api/skills'),
    get: (name: string) => req<Skill>(`/api/skills/${encodeURIComponent(name)}`),
    run: (name: string, args?: string) =>
      req<{ output: string }>('/api/skills/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, args }),
      }),
  },

  config: {
    get: () => req<AgentConfig>('/api/config'),
    set: (patch: Partial<AgentConfig>) =>
      req<AgentConfig>('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
  },
}
