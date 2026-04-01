"""
Hermes Bridge — FastAPI WebSocket/REST bridge for Hermes CLI
Runs inside Webtop container on port 8642.
Wraps `hermes chat -q` subprocess and streams output to WebSocket clients.
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
# Output parsing helpers
# ---------------------------------------------------------------------------

def extract_hermes_session_id(text: str) -> Optional[str]:
    """Pull Hermes session ID out of CLI output."""
    m = re.search(r"hermes --resume (\S+)", text)
    if m:
        return m.group(1)
    m = re.search(r"Session:\s+(\S+)", text)
    if m:
        return m.group(1)
    return None


def is_response_start(line: str) -> bool:
    return "⚕ Hermes" in line and "─" in line


def is_response_end(line: str) -> bool:
    return line.strip().startswith("╰")


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

            in_response = False
            full_output: list[str] = []

            assert proc.stdout is not None
            async for raw_line in proc.stdout:
                line = raw_line.decode("utf-8", errors="replace")
                full_output.append(line)

                if is_response_start(line):
                    in_response = True
                    continue

                if in_response and is_response_end(line):
                    in_response = False
                    continue

                if in_response:
                    content = line.rstrip("\n")
                    # Skip empty decorative lines
                    if content.strip():
                        await websocket.send_text(
                            json.dumps({"type": "token", "content": content + "\n"})
                        )

            await proc.wait()
            await websocket.send_text(json.dumps({"type": "done"}))

            # Persist Hermes session ID for future turns
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
# Sessions REST
# ---------------------------------------------------------------------------

@app.get("/sessions")
async def list_sessions():
    proc = await asyncio.create_subprocess_exec(
        "hermes", "sessions", "list",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    output = stdout.decode(errors="replace").strip()

    sessions = []
    for line in output.splitlines():
        line = line.strip()
        if not line or line.startswith("─") or line.startswith("No sessions"):
            continue
        # hermes sessions list format: "ID  |  title  |  date"
        # Attempt to parse — fall back to using the whole line as ID/title
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
    proc = await asyncio.create_subprocess_exec(
        "hermes", "sessions", "export", h_id,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    # Export may return JSON or text — return minimal structure for now
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


# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8642, log_level="info")
