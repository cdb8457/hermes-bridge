"""
Hermes Bridge — FastAPI WebSocket/REST bridge for Hermes CLI
Runs inside Webtop container on port 8642.

Phase 2: Full output parser — classifies every line from hermes stdout into:
  thinking  → pre-response internal monologue
  token     → actual response content
  tool_call → tool being invoked
  tool_result → tool output
  done      → response complete
"""

import asyncio
import json
import re
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="Hermes Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path.home() / ".hermes" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maps frontend session IDs → Hermes session IDs
session_map: dict[str, str] = {}


# ---------------------------------------------------------------------------
# Output parser
# ---------------------------------------------------------------------------

# Lines containing these are pure decoration — skip entirely
SKIP_PATTERNS = [
    r"Hermes Agent v\d",
    r"Available Tools",
    r"Available Skills",
    r"Resume this session",
    r"Session:\s+\S",
    r"Duration:",
    r"Messages:\s+\d",
    r"Initializing agent",
    r"^\s*Query:",
    r"commits behind",
    r"^\s*[╭╮╰╯]",          # box border lines
    r"^[\s─═]+$",            # horizontal rules
    r"^\s*\(and \d+ more",
    r"gemini|gpt|claude|llama",   # model name lines in splash
    r"/config",
    r"^Nous$",
    r"^Research$",
]

# Tool call detection — Hermes prints these when invoking a tool
TOOL_CALL_PATTERNS = [
    r"^\s*(?:Using|Calling|Running|Invoking) tool[:\s]+(\w+)",
    r"^\s*⚙\s+(\w[\w_.-]+)\(",
    r"^\s*Tool:\s+(\w+)",
    r"^\s*→\s+(\w[\w_.-]+)\s*\(",
]

# Tool result detection
TOOL_RESULT_PATTERNS = [
    r"^\s*(?:Tool result|Result)[:\s]",
    r"^\s*←\s+",
    r"^\s*Output[:\s]",
]


def should_skip(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    for pat in SKIP_PATTERNS:
        if re.search(pat, stripped, re.IGNORECASE):
            return True
    return False


def detect_tool_call(line: str) -> Optional[str]:
    """Return tool name if line is a tool call, else None."""
    for pat in TOOL_CALL_PATTERNS:
        m = re.search(pat, line)
        if m:
            return m.group(1)
    return None


def detect_tool_result(line: str) -> bool:
    for pat in TOOL_RESULT_PATTERNS:
        if re.search(pat, line):
            return True
    return False


def extract_hermes_session_id(text: str) -> Optional[str]:
    m = re.search(r"hermes --resume (\S+)", text)
    if m:
        return m.group(1)
    m = re.search(r"Session:\s+(\S+)", text)
    if m:
        return m.group(1)
    return None


def strip_box_chars(line: str) -> str:
    """Remove leading box-drawing characters from content lines."""
    return line.strip().lstrip("│╎┃").strip()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# WebSocket chat
# ---------------------------------------------------------------------------

@app.websocket("/ws/chat/{frontend_session_id}")
async def websocket_chat(websocket: WebSocket, frontend_session_id: str):
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)

            # Keepalive ping — ignore
            if payload.get("type") == "ping":
                continue

            message: str = payload.get("content", "")
            files: list[str] = payload.get("files", [])

            if not message and not files:
                continue

            # Append file references to message
            if files:
                refs = "\n".join(f"[File: {f}]" for f in files)
                full_message = f"{message}\n\n{refs}" if message else refs
            else:
                full_message = message

            # Build CLI command
            hermes_session_id = session_map.get(frontend_session_id)
            cmd = ["hermes", "chat", "-q", full_message]
            if hermes_session_id:
                cmd.extend(["--resume", hermes_session_id])

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )

            # Parser state
            in_response = False          # inside ╭─ ⚕ Hermes ─╮ box
            in_tool_result = False       # collecting tool result lines
            tool_result_lines: list[str] = []
            current_tool_id: Optional[str] = None
            full_output: list[str] = []
            tool_counter = 0

            assert proc.stdout is not None

            async for raw_line in proc.stdout:
                line = raw_line.decode("utf-8", errors="replace")
                full_output.append(line)
                stripped = line.strip()

                # ── Response box start ───────────────────────────────────
                if "⚕ Hermes" in line and "─" in line:
                    in_response = True
                    in_tool_result = False
                    continue

                # ── Response box end ─────────────────────────────────────
                if in_response and stripped.startswith("╰"):
                    in_response = False
                    continue

                # ── Inside response box → stream as tokens ───────────────
                if in_response:
                    content = strip_box_chars(line)
                    if content:
                        await websocket.send_text(
                            json.dumps({"type": "token", "content": content + "\n"})
                        )
                    continue

                # ── Skip pure decoration ─────────────────────────────────
                if should_skip(line):
                    continue

                # ── Tool result collection ───────────────────────────────
                if in_tool_result:
                    # Empty line or next tool call ends the result block
                    if not stripped or detect_tool_call(line):
                        result_text = "\n".join(tool_result_lines).strip()
                        if result_text and current_tool_id:
                            await websocket.send_text(json.dumps({
                                "type": "tool_result",
                                "tool_call_id": current_tool_id,
                                "content": result_text,
                            }))
                        in_tool_result = False
                        tool_result_lines = []
                        current_tool_id = None
                        # Fall through to check if this is a new tool call

                    else:
                        tool_result_lines.append(stripped)
                        continue

                # ── Tool result start ────────────────────────────────────
                if detect_tool_result(line):
                    in_tool_result = True
                    tool_result_lines = []
                    continue

                # ── Tool call ────────────────────────────────────────────
                tool_name = detect_tool_call(line)
                if tool_name:
                    tool_counter += 1
                    current_tool_id = f"tc_{tool_counter}"

                    # Best-effort: try to extract JSON args from the line
                    input_dict: dict = {}
                    json_match = re.search(r"\{.*\}", line)
                    if json_match:
                        try:
                            input_dict = json.loads(json_match.group())
                        except Exception:
                            input_dict = {"raw": json_match.group()}

                    await websocket.send_text(json.dumps({
                        "type": "tool_call",
                        "tool_call_id": current_tool_id,
                        "name": tool_name,
                        "input": input_dict,
                    }))
                    continue

                # ── Everything else before response box → thinking ───────
                content = strip_box_chars(line)
                if content and len(content) > 2:
                    await websocket.send_text(
                        json.dumps({"type": "thinking", "content": content})
                    )

            await proc.wait()
            await websocket.send_text(json.dumps({"type": "done"}))

            # Store Hermes session ID for conversation continuity
            h_id = extract_hermes_session_id("".join(full_output))
            if h_id:
                session_map[frontend_session_id] = h_id

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_text(
                json.dumps({"type": "error", "message": str(exc)})
            )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@app.get("/sessions")
async def list_sessions():
    proc = await asyncio.create_subprocess_exec(
        "hermes", "sessions", "list",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    sessions = []
    for line in stdout.decode(errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("─") or "No sessions" in line:
            continue
        parts = re.split(r"\s{2,}|\t", line, maxsplit=2)
        sid = parts[0].strip() if parts else line
        title = parts[1].strip() if len(parts) > 1 else sid
        sessions.append({
            "id": sid,
            "title": title,
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
        })
    return sessions


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    h_id = session_map.get(session_id, session_id)
    return {"id": session_id, "title": session_id, "messages": []}


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    h_id = session_map.get(session_id, session_id)
    proc = await asyncio.create_subprocess_exec(
        "hermes", "sessions", "delete", h_id,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()
    session_map.pop(session_id, None)
    return {"ok": True}


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    timestamp = int(time.time())
    safe_name = f"{timestamp}_{file.filename}"
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(await file.read())
    return {
        "path": str(dest),
        "filename": safe_name,
        "url": f"/uploads/{safe_name}",
    }


app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8642, log_level="info")
