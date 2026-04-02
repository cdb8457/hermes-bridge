# Phase 3 — Voice Loop, Session Branching, Cron Scheduler

**Goal:** Ship three high-impact features that make Hermes Bridge feel like a real product,
not a prototype. All three are self-contained — none break existing functionality.
**Prerequisite:** Phase 2 complete (colors, thinking block, live tool cards).

---

## Feature 1: Ambient Voice Loop

### What It Is
Two-way voice conversation with Hermes. WhisperFlow handles voice-in (already works).
The browser's Web Speech API handles voice-out — Hermes's responses are read aloud.
Completely hands-free when enabled.

### UI Spec

```
Header — right side, next to settings icon:
┌─────────────────────────────────┐
│  Hermes Bridge    gemini-3  ● ◉ │
│                            ^  ^  │
│                      connected  │
│                          voice toggle
└─────────────────────────────────┘

Voice toggle states:
  Off: 🔇 muted icon, var(--text-muted)
  On:  🔊 speaker icon, var(--accent-gold), subtle pulse animation

When voice is ON:
  - Every completed assistant message is read aloud via SpeechSynthesis
  - Rate: 1.1 (slightly faster than default)
  - Pitch: 1.0
  - Voice: prefer "Google US English" or first available English voice
  - Reading indicator: thin gold bar animates under the message being read
  - Click anywhere in chat to stop current reading
```

### Implementation

```tsx
// hooks/useVoiceOutput.ts
// Uses window.speechSynthesis — no backend, no API key, no cost
// Strips markdown before speaking (no "asterisk asterisk bold asterisk asterisk")
// Cancels on new message start so responses don't queue up

const speak = (text: string) => {
  window.speechSynthesis.cancel()
  const clean = stripMarkdown(text)  // remove **, #, `, etc.
  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.rate = 1.1
  window.speechSynthesis.speak(utterance)
}
```

### Markdown Stripping Rules
Before speaking, strip:
- `**bold**` → `bold`
- `# Heading` → `Heading`
- `` `code` `` → `code`
- ` ```codeblock``` ` → omit entirely (don't read raw code)
- `[link text](url)` → `link text`
- `> blockquote` → blockquote text only

---

## Future: Voice Settings (Phase 4 or later)

### Tier 1 — Browser Voice Picker (low effort, high value)
Let the user pick from all voices the browser has installed.
Different OSes have different voices — Windows has a lot, macOS has
high-quality Siri voices, Chrome adds Google voices.

```
Settings modal → Voice section:
  Voice: [dropdown — lists all window.speechSynthesis.getVoices()]
  Speed: [slider — 0.75x to 2.0x]
  Pitch: [slider — 0.5 to 2.0]
  Preview: [button — speaks a test sentence]
```

Store selection in localStorage so it persists across sessions.

### Tier 2 — ElevenLabs Custom Voice (medium effort, paid)
ElevenLabs API lets you clone a voice from a 1-minute audio sample
or pick from 1000+ studio voices. Much higher quality than browser TTS.

- User provides ElevenLabs API key in settings
- Select a voice ID from their library or upload a voice clone
- Bridge streams ElevenLabs audio back to the frontend
- Cost: ~$5/month for casual use

Integration approach:
  - Bridge gets the completed response text
  - POSTs to `api.elevenlabs.io/v1/text-to-speech/{voice_id}`
  - Streams MP3 audio back to frontend via a `/tts` endpoint
  - Frontend plays with Web Audio API

### Tier 3 — Local TTS (no cost, higher effort)
Run a local TTS model inside the Webtop container.
Options: Kokoro (very fast, high quality), Piper (lightweight).
Zero API cost, works offline, fully private.

```bash
# Kokoro — best quality local option
pip install kokoro
# Piper — fastest, lowest resource use
pip install piper-tts
```

Bridge adds a `/tts` endpoint that runs the local model and returns audio.

---

## Feature 2: Session Branching

### What It Is
Fork any conversation at any message. Take the same context in a new direction without
losing the original thread. Like git branches but for chat sessions.

### UI Spec

```
MessageBubble — on hover, show branch button:
┌──────────────────────────────────────────┐
│  Hermes response text here...       ⑂    │  ← branch icon appears on hover
└──────────────────────────────────────────┘

Clicking ⑂ on any message:
  1. Creates a new session forked at that point
  2. Copies all messages up to and including that message into the new session
  3. Switches to the new session in the sidebar
  4. New session title: "Branch of [original title]"
  5. User can now continue in a different direction

Sidebar — branched sessions shown indented under parent:
  ┌─ My original chat
  │   └─ Branch of My original chat     ← indented, smaller text
  └─ Another session
```

### Data Model

```typescript
// sessionStore.ts — add to Session interface:
interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  parentId?: string      // ← NEW: ID of session this was branched from
  branchPoint?: number   // ← NEW: message index where branch occurred
}
```

### Implementation Notes
- Branching is pure frontend — copy messages array up to branch point into new session
- New session gets a fresh WebSocket connection with Hermes (new Hermes session ID)
- The branch context is injected as the conversation history in the first message
- No bridge changes needed

---

## Feature 3: Cron Visual Scheduler

### What It Is
A visual panel for Hermes's built-in cron job system. Create, view, pause, and delete
scheduled tasks without touching the terminal.

### UI Spec

```
New right sidebar panel — accessed via clock icon in header:

┌─ Scheduled Tasks ──────────────────── + ─┐
│                                           │
│  ◉ Daily standup summary                 │
│    Every day at 9:00 AM                  │
│    Last run: 2h ago — ✓ success          │
│                                           │
│  ◉ Weekly research digest                │
│    Every Monday at 8:00 AM               │
│    Last run: 3 days ago — ✓ success      │
│                                           │
│  ○ Check server health          [paused] │
│    Every 30 minutes                      │
│    Last run: 1h ago — ✗ failed           │
│                                           │
└───────────────────────────────────────────┘

Clicking + opens Create Task modal:
┌─ New Scheduled Task ───────────────────────┐
│  Task prompt:                              │
│  ┌─────────────────────────────────────┐  │
│  │ <textarea>                          │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  Schedule:                                 │
│  ○ Every X minutes  [30]                  │
│  ○ Daily at         [09:00]               │
│  ○ Weekly on        [Monday] at [08:00]   │
│  ○ Custom cron      [* * * * *]           │
│                                            │
│                    [Cancel]  [Create]      │
└────────────────────────────────────────────┘
```

### Styling

```
Panel:
  width: 280px
  bg: var(--bg-secondary)
  border-left: 1px solid var(--border)

Task card (active):
  border-left: 2px solid var(--accent-gold)
  bg: var(--bg-elevated)
  border-radius: 6px

Task card (paused):
  border-left: 2px solid var(--text-muted)
  opacity: 0.6

Status indicators:
  ✓ success: var(--status-success)
  ✗ failed:  var(--status-error)
  ◉ active:  var(--accent-gold)
  ○ paused:  var(--text-muted)
```

### Bridge Additions Required

```python
# New endpoints in bridge.py

GET  /cron          → runs `hermes cron list`, parses output, returns JSON
POST /cron          → runs `hermes cron add "{prompt}" --schedule "{cron_expr}"`
DELETE /cron/{id}   → runs `hermes cron delete {id}`
POST /cron/{id}/pause  → runs `hermes cron pause {id}`
POST /cron/{id}/resume → runs `hermes cron resume {id}`
```

### API Client Additions

```typescript
// lib/api.ts additions
cron: {
  list: () => req<CronJob[]>('/cron'),
  create: (prompt: string, schedule: string) =>
    req<CronJob>('/cron', { method: 'POST', body: JSON.stringify({ prompt, schedule }) }),
  delete: (id: string) => req<void>(`/cron/${id}`, { method: 'DELETE' }),
  pause: (id: string) => req<void>(`/cron/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => req<void>(`/cron/${id}/resume`, { method: 'POST' }),
}
```

---

## Build Order (Phase 3)

1. Build `useVoiceOutput.ts` hook + markdown stripper utility
2. Add voice toggle to `Header.tsx`
3. Wire voice output into `ChatPanel.tsx` — speak on message complete
4. Add `parentId` / `branchPoint` to session store
5. Add branch button to `MessageBubble.tsx` (hover state)
6. Build branch logic in `App.tsx` — fork session, copy messages, switch
7. Update `SessionList.tsx` — show branched sessions indented under parent
8. Add cron endpoints to `bridge.py`
9. Add cron API methods to `lib/api.ts`
10. Build `CronPanel.tsx` — task list, create modal, pause/resume/delete
11. Add cron panel toggle to `Header.tsx` (clock icon)
12. Wire `CronPanel` into `App.tsx` layout as optional right panel
13. Push → GitHub Actions builds → redeploy on Arcane
14. Update bridge.py on Webtop (`curl` + `pkill` + restart)

---

## Done Criteria (Phase 3)

- [ ] Voice toggle in header — click to enable/disable
- [ ] Hermes responses read aloud when voice is on, markdown stripped cleanly
- [ ] Click anywhere stops current speech
- [ ] Branch button appears on hover over any message
- [ ] Branching creates new session with full context, shown indented in sidebar
- [ ] Cron panel opens from clock icon in header
- [ ] Can create a scheduled task with prompt + schedule picker
- [ ] Can pause, resume, and delete tasks
- [ ] Task list shows last run status (success/fail) and time
- [ ] All Phase 1 + 2 functionality still works
