#!/usr/bin/env python3
"""
Hermes Bridge — WebSocket gateway between the browser UI and the Hermes CLI.

Runs on the Ubuntu VM. Starts the `hermes` CLI as a subprocess, parses every
line of its stdout, and forwards typed events over WebSocket to the frontend.

Event types emitted to the browser:
  {"type": "thinking",    "content": "<line>"}
  {"type": "token",       "content": "<partial text>"}
  {"type": "tool_call",   "tool_call_id": "<id>", "name": "<tool>", "input": {...}}
  {"type": "tool_result", "tool_call_id": "<id>", "content": "<output>"}
  {"type": "done"}
  {"type": "error",       "message": "<msg>"}

Messages received from the browser:
  {"content": "<user text>", "files": ["<path>", ...]}
  {"type": "ping"}
"""

import asyncio
import json
import logging
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path

import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bridge")

# ── Config ────────────────────────────────────────────────────────────────────

HOST = os.getenv("BRIDGE_HOST", "0.0.0.0")
PORT = int(os.getenv("BRIDGE_PORT", "8642"))
HERMES_CMD = os.getenv("HERMES_CMD", "hermes")   # command on PATH, or absolute path
HERMES_ARGS = os.getenv("HERMES_ARGS", "").split() if os.getenv("HERMES_ARGS") else []

# ── Line classifier ───────────────────────────────────────────────────────────

# Matches the opening border of the Hermes response box
RE_RESPONSE_OPEN  = re.compile(r"^╭─\s*⚕\s*Hermes")
RE_RESPONSE_CLOSE = re.compile(r"^╰─")

# Tool call: lines like "  Tool: web_search" or "  ⚙ web_search"
RE_TOOL_START     = re.compile(r"^\s*(?:Tool:|⚙\s+)(\w+)")

# Tool result: "  → <content>" or "  Result:" prefix
RE_TOOL_RESULT    = re.compile(r"^\s*(?:→|Result:)\s*(.*)")

# Session resume line
RE_SESSION_ID     = re.compile(r"Resume this session with:\s*['\"]?(\S+?)['\"]?\s*$")

# JSON tool call embedded in output (hermes may print tool calls as JSON)
RE_JSON_TOOL      = re.compile(r'^\s*\{.*"name"\s*:\s*"(\w+)".*\}$')


class LineClassifier:
    """
    Stateful parser that reads Hermes stdout line by line and yields events.

    States:
      pre_response  — before the ╭─ Hermes box
      in_response   — inside the response box
      in_tool       — accumulating a tool call block
    """

    def __init__(self):
        self.state = "pre_response"
        self.current_tool_id: str | None = None
        self.current_tool_name: str | None = None
        self.tool_input_lines: list[str] = []
        self.collecting_result = False
        self.result_lines: list[str] = []

    def feed(self, raw_line: str) -> list[dict]:
        """Process one line and return a list of events (may be empty)."""
        line = raw_line.rstrip("\n")
        events: list[dict] = []

        # ── Session ID extraction (any state) ────────────────────────────────
        m = RE_SESSION_ID.search(line)
        if m:
            events.append({"type": "session_id", "session_id": m.group(1)})

        # ── State machine ─────────────────────────────────────────────────────
        if self.state == "pre_response":
            if RE_RESPONSE_OPEN.match(line):
                self.state = "in_response"
            elif self._is_tool_start(line):
                events.extend(self._start_tool(line))
            elif line.strip():
                events.append({"type": "thinking", "content": line})

        elif self.state == "in_response":
            if RE_RESPONSE_CLOSE.match(line):
                self.state = "pre_response"
                events.append({"type": "done"})
            elif self._is_tool_start(line):
                # Tool call embedded inside response
                events.extend(self._start_tool(line))
                self.state = "in_tool"
            else:
                # Strip the leading │ border character if present
                text = re.sub(r"^│\s?", "", line)
                if text or line.startswith("│"):
                    events.append({"type": "token", "content": text + "\n"})

        elif self.state == "in_tool":
            m_result = RE_TOOL_RESULT.match(line)
            if m_result:
                # Flush any accumulated input, begin result collection
                self._flush_tool_input(events)
                self.collecting_result = True
                first = m_result.group(1)
                if first:
                    self.result_lines.append(first)
            elif line.strip() == "" and self.collecting_result:
                # Blank line ends the result block
                events.extend(self._flush_tool_result())
                self.state = "in_response"
            elif RE_RESPONSE_OPEN.match(line):
                # Response resumed after tool
                events.extend(self._flush_tool_result())
                self.state = "in_response"
            elif RE_RESPONSE_CLOSE.match(line):
                events.extend(self._flush_tool_result())
                self.state = "pre_response"
                events.append({"type": "done"})
            elif self.collecting_result:
                self.result_lines.append(line)
            else:
                self.tool_input_lines.append(line)

        return events

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _is_tool_start(self, line: str) -> bool:
        return bool(RE_TOOL_START.match(line))

    def _start_tool(self, line: str) -> list[dict]:
        # Flush any previous unfinished tool
        events: list[dict] = []
        if self.current_tool_id and self.collecting_result:
            events.extend(self._flush_tool_result())
        elif self.current_tool_id:
            self._flush_tool_input(events)

        m = RE_TOOL_START.match(line)
        tool_name = m.group(1) if m else "unknown"
        self.current_tool_id = f"tc_{uuid.uuid4().hex[:8]}"
        self.current_tool_name = tool_name
        self.tool_input_lines = []
        self.result_lines = []
        self.collecting_result = False
        self.state = "in_tool"

        events.append({
            "type": "tool_call",
            "tool_call_id": self.current_tool_id,
            "name": tool_name,
            "input": {},
        })
        return events

    def _flush_tool_input(self, events: list[dict]) -> None:
        """Try to parse accumulated input lines as JSON and update the tool_call."""
        if not self.current_tool_id or not self.tool_input_lines:
            return
        raw = "\n".join(self.tool_input_lines).strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"raw": raw} if raw else {}
        if parsed:
            events.append({
                "type": "tool_call_input",
                "tool_call_id": self.current_tool_id,
                "input": parsed,
            })
        self.tool_input_lines = []

    def _flush_tool_result(self) -> list[dict]:
        events: list[dict] = []
        if not self.current_tool_id:
            return events
        content = "\n".join(self.result_lines).strip()
        events.append({
            "type": "tool_result",
            "tool_call_id": self.current_tool_id,
            "content": content,
        })
        self.current_tool_id = None
        self.current_tool_name = None
        self.result_lines = []
        self.collecting_result = False
        return events


# ── Session handler ───────────────────────────────────────────────────────────

async def handle_session(ws: WebSocketServerProtocol, session_id: str) -> None:
    """One WebSocket connection = one chat session with Hermes."""
    log.info("Session %s connected from %s", session_id, ws.remote_address)

    proc: asyncio.subprocess.Process | None = None
    classifier = LineClassifier()

    async def send(event: dict) -> None:
        try:
            await ws.send(json.dumps(event))
        except Exception:
            pass

    async def run_hermes(user_text: str, files: list[str]) -> None:
        nonlocal proc, classifier

        # Reset classifier for each new turn
        classifier = LineClassifier()

        # Build command
        prompt = user_text
        if files:
            prompt += "\n\nAttached files:\n" + "\n".join(f"  - {f}" for f in files)

        cmd = [HERMES_CMD, *HERMES_ARGS, "--session", session_id, "--prompt", prompt]

        log.info("Spawning: %s", " ".join(cmd))
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
        except FileNotFoundError:
            await send({"type": "error", "message": f"hermes command not found: {HERMES_CMD}"})
            return

        assert proc.stdout is not None
        async for raw in proc.stdout:
            line = raw.decode("utf-8", errors="replace")
            log.debug("HERMES> %s", line.rstrip())
            for event in classifier.feed(line):
                await send(event)

        await proc.wait()
        # Ensure we always emit done
        if classifier.state != "pre_response":
            await send({"type": "done"})

    # ── Main receive loop ─────────────────────────────────────────────────────
    try:
        async for raw_msg in ws:
            try:
                msg = json.loads(raw_msg)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "ping":
                await send({"type": "pong"})
                continue

            content = msg.get("content", "").strip()
            files   = msg.get("files", [])

            if not content and not files:
                continue

            # Kill any running process before starting a new one
            if proc and proc.returncode is None:
                proc.kill()
                await proc.wait()

            asyncio.ensure_future(run_hermes(content, files))

    except websockets.exceptions.ConnectionClosedOK:
        pass
    except websockets.exceptions.ConnectionClosedError as e:
        log.warning("Session %s closed with error: %s", session_id, e)
    finally:
        if proc and proc.returncode is None:
            proc.kill()
        log.info("Session %s disconnected", session_id)


# ── Router ─────────────────────────────────────────────────────────────────────

async def router(ws: WebSocketServerProtocol) -> None:
    """Route connections based on URL path: /ws/chat/{session_id}"""
    path = ws.request.path  # type: ignore[attr-defined]
    m = re.match(r"^/ws/chat/(.+)$", path)
    if m:
        await handle_session(ws, m.group(1))
    else:
        log.warning("Unknown path: %s", path)
        await ws.close(1008, "Unknown path")


# ── Entry point ────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("Hermes Bridge starting on ws://%s:%d", HOST, PORT)
    async with websockets.serve(router, HOST, PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Bridge stopped.")
        sys.exit(0)
