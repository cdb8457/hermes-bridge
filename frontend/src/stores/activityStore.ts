import { create } from 'zustand'

export type ActivityEventType =
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'response'
  | 'user_message'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  label: string
  timestamp: number
  sessionId: string
  detail?: string
}

interface ActivityState {
  events: ActivityEvent[]
  pushEvent: (e: Omit<ActivityEvent, 'id'>) => void
  clearSession: (sessionId: string) => void
  clearAll: () => void
}

const MAX_EVENTS = 200

export const useActivityStore = create<ActivityState>((set) => ({
  events: [],

  pushEvent: (e) =>
    set((s) => {
      const event: ActivityEvent = {
        ...e,
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }
      const next = [event, ...s.events]
      return { events: next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next }
    }),

  clearSession: (sessionId) =>
    set((s) => ({ events: s.events.filter((e) => e.sessionId !== sessionId) })),

  clearAll: () => set({ events: [] }),
}))
