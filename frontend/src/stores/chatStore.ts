import { create } from 'zustand'

export type MessageRole = 'user' | 'assistant'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  toolCalls?: ToolCall[]
  files?: string[]
  streaming?: boolean
  timestamp: number
}

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  pendingFiles: string[]
  addMessage: (msg: Message) => void
  appendToken: (id: string, token: string) => void
  addToolCall: (msgId: string, toolCall: ToolCall) => void
  updateToolResult: (msgId: string, toolCallId: string, result: string) => void
  setStreaming: (v: boolean) => void
  setMessageStreaming: (id: string, v: boolean) => void
  clearMessages: () => void
  loadMessages: (msgs: Message[]) => void
  addPendingFile: (path: string) => void
  removePendingFile: (path: string) => void
  clearPendingFiles: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  pendingFiles: [],

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  appendToken: (id, token) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),

  addToolCall: (msgId, toolCall) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId
          ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
          : m
      ),
    })),

  updateToolResult: (msgId, toolCallId, result) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              toolCalls: m.toolCalls?.map((tc) =>
                tc.id === toolCallId ? { ...tc, result } : tc
              ),
            }
          : m
      ),
    })),

  setStreaming: (v) => set({ isStreaming: v }),

  setMessageStreaming: (id, v) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, streaming: v } : m
      ),
    })),

  clearMessages: () => set({ messages: [] }),

  loadMessages: (msgs) => set({ messages: msgs }),

  addPendingFile: (path) =>
    set((s) => ({ pendingFiles: [...s.pendingFiles, path] })),

  removePendingFile: (path) =>
    set((s) => ({ pendingFiles: s.pendingFiles.filter((p) => p !== path) })),

  clearPendingFiles: () => set({ pendingFiles: [] }),
}))
