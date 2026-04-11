# Hermes Bridge — Build Checklist

---

## Phase 1 — Core Chat UI ✅

- [x] Project scaffold (React + Vite + TypeScript + Tailwind)
- [x] Gold/amber + cyan design system (CSS variables, Geist Mono font)
- [x] `<textarea>` input — WhisperFlow compatible, auto-refocus after send
- [x] WebSocket chat hook (`useHermesChat`) with auto-reconnect + ping keepalive
- [x] Streaming token rendering with blinking cursor
- [x] Markdown rendering with syntax highlighting (react-markdown + rehype-highlight)
- [x] Session list sidebar — load from API, switch sessions, delete
- [x] Session branching — fork conversation at any message (GitBranch button on hover)
- [x] File drag-and-drop upload (`useFileUpload`, `FileDropZone`)
- [x] nginx Docker image — proxies `/api/` and `/ws/` to Hermes backend on `:8642`
- [x] `docker-compose.yml` + `.env.example`

---

## Phase 2 — Thinking Visibility & CLI Color Parity ✅

- [x] Color system updated — gold dominant, cyan secondary, matches Hermes CLI
- [x] Header wordmark → gold; model name → cyan
- [x] SessionList — active session gold border, New Chat gold button
- [x] `ThinkingBlock` — collapsible, gold label, shows pre-response monologue lines
- [x] `ToolCallCard` — running state (orange pulse), done state (dimmed, expandable input/output)
- [x] `MessageBubble` — ThinkingBlock above agent messages, ToolCallCards, branch button
- [x] `useHermesChat` — handles `thinking`, `token`, `tool_call`, `tool_result`, `done`, `error` events
- [x] `MemoryPanel` — Card / Context / Honcho Sessions tabs, 60s auto-refresh
- [x] `CronPanel` — list jobs, create (minutes/daily/weekly/custom), pause/resume/delete
- [x] `MissionControl` — live activity feed, session stats, top-5 tools bar chart, agent status
- [x] `activityStore` (Zustand) — feeds MissionControl and per-session event log
- [x] Voice output toggle (TTS via `useVoiceOutput`)

---

## Phase 3 — Polish & Power Features ✅

### Settings & Configuration
- [x] Settings panel — gear icon in Header opens side panel
- [x] Model selector dropdown — show current model, switch on the fly via `/api/config`
- [x] Workspace path switcher — set working directory via settings panel
- [x] API endpoint config — runtime localStorage override in Settings panel, no rebuild needed

### Skills Panel
- [x] Skills panel component — list installed Hermes skills from `/api/skills`
- [x] View skill content — expand a skill to read its definition
- [x] Run skill — Zap icon in header; "run" button injects `/skill-name` into input bar

### Session Management
- [x] Inline session rename — double-click title in sidebar to rename
- [x] Session search — filter input at top of sidebar, filters by title in real-time
- [x] Chat export — `.md` and `.json` buttons appear in chat toolbar when messages exist

### Command Palette
- [x] Ctrl+K command palette — quick-switch sessions, toggle panels, new chat
- [x] Keyboard navigation — ↑↓ arrows, Enter to execute, Esc to close

### Bridge (`bridge.py`)
- [x] Full line classifier — categorizes stdout into `thinking`, `token`, `tool_call`, `tool_result`, `done`
- [x] Emit `tool_call` + `tool_result` events with matching IDs so live timeline works
- [x] Extract session ID from `Resume this session with:` line
- [ ] End-to-end test — deploy to Ubuntu VM and verify against live Hermes

---

## Deployment

- [ ] Transfer `hermes-bridge/` to Ubuntu VM
- [ ] `pip install websockets` on VM, run `python bridge.py` to test bridge standalone
- [ ] `docker compose up --build` — verify UI loads on port 6001
- [ ] Add Pangolin site entry for `hermes.btow.org`
- [ ] Smoke test full flow against live Hermes backend on `:8642`
