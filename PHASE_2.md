# Phase 2 — Thinking Visibility, CLI Color Parity, Live Tool Timeline

**Goal:** Make the UI feel native to Hermes — matching its visual language and exposing the
agent's internal reasoning in real time.
**Prerequisite:** Phase 1 complete and running on Arcane (done).

---

## Color System Update

The Hermes CLI uses a gold/amber dominant palette, not cyan. Cyan is secondary (model name,
active cursor). We must update the design system to match.

### Updated CSS Variables

```css
:root {
  /* Backgrounds — same as Phase 1 */
  --bg-primary:    #000000;   /* pure black — matches CLI terminal bg */
  --bg-secondary:  #0d0d0d;
  --bg-elevated:   #141414;
  --bg-hover:      #1a1a1a;
  --border:        #2a2a2a;
  --border-bright: #333333;

  /* NEW: Gold/amber — Hermes primary accent (headers, categories, logo) */
  --accent-gold:      #d4a017;
  --accent-gold-dim:  #a37810;
  --accent-gold-glow: rgba(212, 160, 23, 0.12);

  /* Cyan — secondary accent (model name, interactive elements, send button) */
  --accent-cyan:     #00d4aa;
  --accent-cyan-dim: #00a882;
  --accent-cyan-glow: rgba(0, 212, 170, 0.12);

  /* Orange — tool calls (same as Phase 1) */
  --accent-orange: #ff6b35;
  --accent-purple: #8b5cf6;

  /* Text */
  --text-primary:   #c8c8c8;   /* slightly warmer off-white, matches CLI */
  --text-secondary: #888888;
  --text-muted:     #555555;
  --text-code:      #a8ff78;

  /* Thinking/monologue — distinct dimmed palette */
  --thinking-bg:     #0a0a0a;
  --thinking-border: #2a2a2a;
  --thinking-text:   #666666;
  --thinking-label:  #d4a017;  /* gold — matches CLI category label style */

  /* Status */
  --status-success: #22c55e;
  --status-error:   #ef4444;
}
```

### What Changes Visually

| Element | Phase 1 | Phase 2 |
|---|---|---|
| "Hermes Bridge" wordmark | cyan | gold `var(--accent-gold)` |
| Sidebar "+ New Chat" button | cyan border | gold border |
| Active session indicator | cyan left border | gold left border |
| Header model name | muted | cyan (matches CLI status bar) |
| Send button | cyan bg | cyan bg (unchanged) |
| Tool call cards | orange border | orange border (unchanged) |

---

## Feature 1: Internal Monologue / Chain of Thought

### What It Is

Everything Hermes outputs *before* the final response box — initialization messages, reasoning
steps, tool decisions — displayed as a collapsed "thinking" block above the response.

### Visual Spec

```
┌─ thinking ──────────────────────────────────── ▼ ─┐   ← collapsed by default
│  (click chevron to expand)                         │   ← gold label, dark bg
└────────────────────────────────────────────────────┘

Expanded:
┌─ thinking ──────────────────────────────────── ▲ ─┐
│  Initializing agent...                             │
│  Loading 31 tools, 100 skills                      │
│  Deciding approach: web_search → summarize         │
│  ...                                               │
└────────────────────────────────────────────────────┘
╭─ ⚕ Hermes ──────────────────────────────────────╮
  Final response here...
╰─────────────────────────────────────────────────╯
```

### Styling

```
ThinkingBlock (collapsed):
  bg: var(--thinking-bg)
  border: 1px solid var(--thinking-border)
  border-radius: 6px
  padding: 6px 12px
  label: "thinking" in var(--thinking-label) — Geist Mono, 11px
  chevron: var(--text-muted), right-aligned
  cursor: pointer

ThinkingBlock (expanded):
  same container, taller
  content: var(--thinking-text), Geist Mono, 12px, line-height 1.6
  max-height: 300px, overflow-y: auto
```

### Bridge Changes Required

The bridge currently only captures lines *inside* the response box. It must be updated to:

1. Capture all lines *before* `╭─ ⚕ Hermes` as "thinking" content
2. Send them as a new event type: `{"type": "thinking", "content": "..."}`
3. Frontend accumulates thinking lines and shows them in the ThinkingBlock

---

## Feature 2: Live Tool Call Timeline

### What It Is

Tool calls displayed as they happen — not after the fact. While Hermes is running a tool, the
card shows a spinner. When it finishes, the card updates with the result.

### Visual Spec

```
Running:
┌─ ⚙ web_search ──────────────── ◌ running ─┐
│  query: "latest news about X"              │
└────────────────────────────────────────────┘

Done (collapsed):
┌─ ⚙ web_search ──────────────── ✓ done ───┐   ← click to expand
└────────────────────────────────────────────┘

Done (expanded):
┌─ ⚙ web_search ──────────────── ✓ done ───┐
│  INPUT                                     │
│  { "query": "latest news about X" }        │
│  OUTPUT                                    │
│  Found 5 results: ...                      │
└────────────────────────────────────────────┘
```

### Styling Updates to ToolCallCard

```
Running state:
  border: 1px solid var(--accent-orange)
  status badge: "◌ running" in var(--accent-orange), animated pulse
  cursor: default (not expandable while running)

Done state:
  border: 1px solid var(--border-bright)   ← dims after completion
  status badge: "✓ done" in var(--status-success)
  cursor: pointer (expandable)
```

### Bridge Changes Required

Parse the CLI output for tool call patterns and emit:
```json
{ "type": "tool_call", "id": "tc_1", "name": "web_search", "input": {...} }
{ "type": "tool_result", "id": "tc_1", "content": "..." }
```

---

## Feature 3: Bridge Output Parser Rewrite

The current bridge only reads inside the `╭─ ⚕ Hermes` box. Phase 2 requires parsing the full
output stream and classifying every line.

### Line Classification Rules

| Pattern | Event type |
|---|---|
| Before `╭─ ⚕ Hermes` line | `thinking` |
| Inside response box | `token` |
| `Tool:` or `⚙` prefix lines | `tool_call` |
| Lines after a tool call block | `tool_result` |
| `╰──` closing border | triggers `done` |
| `Resume this session with:` | extract session ID |

### Output Pipeline

```
Hermes stdout
    │
    ▼
LineClassifier (bridge.py)
    │
    ├─ thinking lines  → {"type": "thinking", "content": "..."}
    ├─ token lines     → {"type": "token", "content": "..."}
    ├─ tool_call lines → {"type": "tool_call", "id": ..., "name": ..., "input": ...}
    ├─ tool_result     → {"type": "tool_result", "id": ..., "content": "..."}
    └─ done            → {"type": "done"}
    │
    ▼
WebSocket → Frontend
```

---

## Build Order (Phase 2)

1. Update `index.css` — new color variables, keep all existing vars as aliases
2. Update `Header.tsx` — wordmark to gold, model name to cyan
3. Update `SessionList.tsx` — active session border to gold, new chat button to gold
4. Build `ThinkingBlock.tsx` — collapsed/expanded thinking display
5. Update `ToolCallCard.tsx` — running/done states, dimmed border when complete
6. Update `MessageBubble.tsx` — render ThinkingBlock above agent messages
7. Rewrite bridge output parser in `bridge.py` — full line classification
8. Update `useHermesChat.ts` — handle new `thinking` event type
9. Push, rebuild Docker image, redeploy on Arcane
10. Test end-to-end: send message, watch thinking expand, tool calls animate, response renders

---

## Done Criteria (Phase 2)

- [ ] Colors match Hermes CLI — gold wordmark, cyan model name, dark terminal bg
- [ ] Thinking block appears above every agent response, collapsed by default
- [ ] Clicking chevron expands thinking block to show full pre-response output
- [ ] Tool call cards show live "running" state with pulse animation
- [ ] Tool cards dim and show "done" when result arrives
- [ ] Expanding a done tool card shows input and output
- [ ] Bridge correctly classifies all line types from hermes output
- [ ] All Phase 1 functionality still works
