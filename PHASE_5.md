# Phase 5 — Memory Viewer

**Goal:** Surface everything Honcho knows about you directly inside the Bridge UI.
A live panel showing your peer card, stored context/memories, and session history —
all pulled from your self-hosted Honcho instance on Arcane.

**Prerequisite:** Phase 4 complete. Honcho running at 192.168.1.31:8686.

---

## Honcho API Structure

Honcho organizes data as: Workspace → Peer → Sessions/Memories

| Config | Value |
|--------|-------|
| Workspace | `hermes` |
| Peer | `admin` |
| Base URL | `http://192.168.1.31:8686` |

Key endpoints used:
- `GET /workspaces/{workspace}/peers/{peer}/card` — peer card (key facts summary)
- `GET /workspaces/{workspace}/peers/{peer}/context` — full memory context
- `POST /workspaces/{workspace}/peers/{peer}/sessions` — session list

---

## Feature: Memory Panel

A slide-in right panel (300px) showing three tabs:

```
┌─ Memory ────────────────────────── ✕ ─┐
│  [Card]  [Context]  [Sessions]         │
│                                        │
│  PEER CARD ──────────────────────────  │
│  admin @ hermes                        │
│                                        │
│  Name: Clint                           │
│  Projects: Hermes Bridge, PE-LLM,      │
│            Mid-Illinois Pulse          │
│  Setup: Ubuntu VM 192.168.1.31         │
│  Voice: WisprFlow                      │
│  Preference: Zero-friction, terminal   │
│                                        │
│  Last updated: 2 min ago     ↻ Refresh │
└────────────────────────────────────────┘
```

### Tab 1 — Card
The peer card: Honcho's distilled summary of who you are.
Short facts, preferences, key context. Auto-refreshes every 60s.

### Tab 2 — Context
Full memory context as Hermes sees it. Raw text of everything
Honcho would inject into a new conversation. Scrollable, monospace.

### Tab 3 — Sessions
List of Honcho sessions with timestamps. Shows how many
messages each session contributed to memory.

---

## Backend: bridge.py additions

```python
HONCHO_BASE = os.getenv("HONCHO_BASE_URL", "http://192.168.1.31:8686")
HONCHO_WORKSPACE = os.getenv("HONCHO_WORKSPACE", "hermes")
HONCHO_PEER = os.getenv("HONCHO_PEER", "admin")

@app.get("/memory/card")
async def get_memory_card():
    r = requests.get(f"{HONCHO_BASE}/workspaces/{HONCHO_WORKSPACE}/peers/{HONCHO_PEER}/card")
    return r.json()

@app.get("/memory/context")
async def get_memory_context():
    r = requests.get(f"{HONCHO_BASE}/workspaces/{HONCHO_WORKSPACE}/peers/{HONCHO_PEER}/context")
    return r.json()

@app.post("/memory/sessions")
async def get_memory_sessions():
    r = requests.post(f"{HONCHO_BASE}/workspaces/{HONCHO_WORKSPACE}/peers/{HONCHO_PEER}/sessions")
    return r.json()
```

---

## Frontend additions

```
lib/api.ts           — add api.memory.card(), context(), sessions()
stores/memoryStore.ts — card, context, sessions state + refresh action
components/Memory/MemoryPanel.tsx — tabbed panel
components/Header/Header.tsx      — Brain icon toggle
App.tsx              — wire memoryOpen state + <MemoryPanel>
```

---

## Styling

Panel: 300px, same dark theme, gold accents
Tab bar: underline style, gold active tab
Card section: key-value grid, gold keys, white values
Context section: monospace, --text-secondary, scrollable
Sessions: list with timestamps, message counts dimmed

---

## Build Order

1. Add `/memory/card`, `/memory/context`, `/memory/sessions` to `bridge.py`
2. Add `api.memory` methods to `lib/api.ts`
3. Create `stores/memoryStore.ts`
4. Build `components/Memory/MemoryPanel.tsx`
5. Add `Brain` icon to `Header.tsx`
6. Wire into `App.tsx`
7. Push → deploy

---

## Done Criteria

- [ ] Brain icon in header opens/closes Memory panel
- [ ] Card tab shows peer card facts from Honcho
- [ ] Context tab shows full injected memory text
- [ ] Sessions tab lists Honcho sessions with timestamps
- [ ] Refresh button re-fetches all three
- [ ] Auto-refreshes every 60 seconds while panel is open
- [ ] All Phase 1-4 functionality still works
