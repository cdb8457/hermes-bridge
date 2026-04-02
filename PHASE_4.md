# Phase 4 — Mission Control Dashboard

**Goal:** Give you a real-time bird's-eye view of everything Hermes is doing.
A live activity feed, session stats, tool usage summary, and agent status —
all in one panel. No new backend required; everything is derived from events
the frontend already receives over the WebSocket.

**Prerequisite:** Phase 3 complete (voice, branching, cron).

---

## Feature: Mission Control Panel

### What It Is
A slide-in right panel (280px) showing:
- Current agent status badge (Idle / Thinking / Streaming / Running Tool)
- Live activity feed — every thinking block, tool call, and completed response,
  timestamped and color-coded, most recent first
- Session stats for the active session (messages, tool calls, thinking blocks)
- Tool usage summary — which tools Hermes has called most in this session

Accessed via a `LayoutDashboard` icon in the header (right side, next to cron clock).

---

## UI Spec

```
Header — right side:
  ⚕ Hermes Bridge   gemini-3   ● 🔊 ◷ ⊞ ⚙
                                   ^  ^  ^
                              voice  cron  dashboard (NEW)

Mission Control Panel (280px, right side):
┌─ Mission Control ──────────────── ✕ ─┐
│                                       │
│  STATUS                               │
│  ◉ Idle                               │  ← gold/green/orange/cyan badge
│                                       │
│  SESSION STATS ─────────────────────  │
│  12  messages                         │
│   4  tool calls                       │
│   3  thinking blocks                  │
│                                       │
│  TOP TOOLS ──────────────────────── │
│  bash          ████████████  8        │
│  read_file     ████████      5        │
│  web_search    ████          3        │
│                                       │
│  ACTIVITY FEED ─────────────────────  │
│  just now  ◉ Response complete        │
│  1m ago    ⚙ bash(ls -la)            │
│  1m ago    💭 thinking  (4 lines)     │
│  3m ago    ⚙ web_search(...)         │
│  3m ago    💭 thinking  (2 lines)     │
│  5m ago    ◉ Response complete        │
│  ...                                  │
└───────────────────────────────────────┘
```

### Status Badge Colors
| State          | Color                  | Symbol |
|----------------|------------------------|--------|
| Idle           | `var(--status-success)` | ◉     |
| Thinking       | `var(--accent-gold)`    | 💭     |
| Streaming      | `var(--accent-cyan)`    | ◎     |
| Running Tool   | `var(--status-warning)` | ⚙     |

---

## Activity Store

```typescript
// stores/activityStore.ts
interface ActivityEvent {
  id: string
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'user_message'
  label: string        // human-readable summary
  timestamp: number
  sessionId: string
  detail?: string      // tool args, first line of thinking, etc.
}

interface ActivityState {
  events: ActivityEvent[]       // capped at 200 most recent
  pushEvent: (e: Omit<ActivityEvent, 'id'>) => void
  clearSession: (sessionId: string) => void
}
```

Events are pushed from `useHermesChat.ts` at the same points where the
chat store is updated. Cap at 200 entries to avoid memory bloat.

---

## Wiring into useHermesChat

```typescript
// In the WebSocket message handler, after existing store updates:

case 'thinking':
  pushEvent({ type: 'thinking', label: `thinking`, detail: data.content, timestamp: Date.now(), sessionId })
  break

case 'tool_call':
  pushEvent({ type: 'tool_call', label: `${data.name}(...)`, detail: JSON.stringify(data.input), timestamp: Date.now(), sessionId })
  break

case 'done':
  pushEvent({ type: 'response', label: 'Response complete', timestamp: Date.now(), sessionId })
  break
```

---

## Component: MissionControl.tsx

```
components/Dashboard/MissionControl.tsx

Props:
  onClose: () => void
  sessionId: string
  agentStatus: 'idle' | 'thinking' | 'streaming' | 'running'

Internal:
  - Reads activityStore (filtered to current sessionId)
  - Computes stats from chatStore messages
  - Computes tool usage counts from chatStore toolCalls
  - Auto-scrolls activity feed on new events (but pauses if user scrolled up)
```

### Styling

```
Panel:
  width: 280px
  bg: var(--bg-secondary)
  border-left: 1px solid var(--border)

Section headers:
  font-size: 10px
  letter-spacing: 0.08em
  text-transform: uppercase
  color: var(--text-muted)
  margin: 12px 0 6px

Status badge:
  display: inline-flex
  align-items: center
  gap: 6px
  font-size: 13px
  font-weight: 600
  color: <per-state color>

Stats grid:
  display: grid
  grid-template-columns: 2rem 1fr
  gap: 4px 8px
  font-size: 12px
  number column: var(--accent-gold), monospace

Tool bar:
  height: 6px
  background: var(--accent-gold) / opacity 0.2
  fill: var(--accent-gold) / opacity 0.7
  border-radius: 2px
  max-width: 100px

Activity entry:
  display: flex
  gap: 8px
  font-size: 11px
  padding: 3px 0
  border-bottom: 1px solid var(--border)
  timestamp: var(--text-muted), monospace
  label: var(--text-secondary)
  tool_call entries: label color = var(--status-warning)
  thinking entries: label color = var(--accent-gold)
  response entries: label color = var(--status-success)
  user entries: label color = var(--accent-cyan)
```

---

## Agent Status Derivation

`agentStatus` is computed in `App.tsx` from the streaming state:

```typescript
const streaming = useChatStore((s) => s.streaming)
const messages = useChatStore((s) => s.messages)
const lastMsg = messages[messages.length - 1]

const agentStatus = !streaming
  ? 'idle'
  : lastMsg?.toolCalls?.some((tc) => tc.running)
    ? 'running'
    : lastMsg?.thinking && lastMsg.thinking.length > 0 && !lastMsg.content
      ? 'thinking'
      : 'streaming'
```

---

## Build Order (Phase 4)

1. Create `stores/activityStore.ts`
2. Wire activity events into `hooks/useHermesChat.ts`
3. Build `components/Dashboard/MissionControl.tsx`
4. Add agentStatus derivation in `App.tsx`
5. Add `dashboardOpen` state + `LayoutDashboard` icon to `Header.tsx`
6. Wire `<MissionControl>` into `App.tsx` layout
7. Push → GitHub Actions → redeploy

---

## Done Criteria (Phase 4)

- [ ] Dashboard icon in header opens/closes Mission Control panel
- [ ] Status badge updates in real time (idle / thinking / streaming / running)
- [ ] Session stats accurate (message count, tool call count, thinking block count)
- [ ] Tool usage bar chart shows top tools used in current session
- [ ] Activity feed shows all events in reverse-chron order, color-coded by type
- [ ] Switching sessions clears feed to that session's events
- [ ] All Phase 1–3 functionality still works
