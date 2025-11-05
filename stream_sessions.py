#!/usr/bin/env python3
"""
Concurrent session stream viewer.

Extends the base stream script by prefixing each line with the related session ID
so parallel executions can be inspected side-by-side.
"""

import json
import os
import sys
import http.client
from urllib.parse import urlparse
from typing import Any, Dict, Optional

BASE_URL = os.environ.get("OPENCODE_SERVER_URL", "http://127.0.0.1:4096")


def parse_sse_event(line: str) -> Optional[str]:
    if line.startswith("data: "):
        return line[6:]
    return None


def extract_session_id(event: Dict[str, Any]) -> Optional[str]:
    properties = event.get("properties") or {}
    session_id = properties.get("sessionID") or properties.get("sessionId")
    if session_id:
        return session_id

    info = properties.get("info")
    if isinstance(info, dict):
        session_id = info.get("id") or info.get("sessionID")
        if session_id:
            return session_id

    part = properties.get("part")
    if isinstance(part, dict):
        session_id = part.get("sessionID") or part.get("sessionId")
        if session_id:
            return session_id

    return None


def prefix(session_id: Optional[str]) -> str:
    if session_id:
        return f"[session {session_id}]"
    return "[server]"


def format_event(event_data: str) -> str:
    try:
        event = json.loads(event_data)
    except json.JSONDecodeError:
        return ""

    event_type = event.get("type", "unknown")
    properties = event.get("properties", {})
    session_id = extract_session_id(event)
    leader = prefix(session_id)

    if event_type == "server.connected":
        return f"{leader} connected\n"

    if event_type == "session.created":
        details = properties.get("info", {})
        title = details.get("title", "")
        return f"{leader} created {title}\n"

    if event_type == "session.idle":
        return f"{leader} idle\n"

    if event_type == "session.error":
        error = properties.get("error", {})
        message = error.get("data", {}).get("message", "Unknown error")
        return f"{leader} error: {message}\n"

    if event_type == "message.part.updated":
        part = properties.get("part", {})
        part_type = part.get("type")
        delta = properties.get("delta", "")

        if part_type == "text":
            return f"{leader} text: {delta}" if delta else ""

        if part_type == "reasoning":
            if delta:
                return f"{leader} reasoning: {delta}"
            text = part.get("text", "")
            if text:
                return f"{leader} reasoning-start {text}\n"
            return ""

        if part_type == "tool":
            tool_name = part.get("tool", "unknown")
            state = part.get("state", {})
            status = state.get("status", "unknown")

            if status == "running":
                tool_input = state.get("input", {})
                summary = json.dumps(tool_input, ensure_ascii=True) if tool_input else ""
                return f"{leader} tool {tool_name} running {summary}\n"

            if status == "completed":
                output = state.get("output", "").strip()
                if output:
                    lines = output.split('\n')
                    preview = '\n'.join(lines[:10])
                    suffix = "\n..." if len(lines) > 10 else ""
                    return f"{leader} tool {tool_name} output\n{preview}{suffix}\n"
                return f"{leader} tool {tool_name} completed (no output)\n"

            if status == "error":
                err = state.get("error", "Unknown tool error")
                return f"{leader} tool {tool_name} error: {err}\n"

        return ""

    if event_type == "todo.updated":
        items = properties.get("todos", [])
        return f"{leader} todo updated ({len(items)} items)\n"

    if event_type == "permission.updated":
        title = properties.get("title", "permission")
        pattern = properties.get("pattern", "")
        if isinstance(pattern, list):
            pattern = " ".join(pattern)
        return f"{leader} permission: {title} {pattern}\n"

    return ""


def main() -> None:
    print("Connecting to opencode event stream with session-aware output...")
    print(f"URL: {BASE_URL}/event")
    print("Press Ctrl+C to stop\n")
    print("-" * 60)

    try:
        parsed = urlparse(BASE_URL)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 4096

        conn = http.client.HTTPConnection(host, port)
        conn.request("GET", "/event", headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache"
        })

        response = conn.getresponse()
        if response.status != 200:
            print(f"Error: Server returned status {response.status}")
            sys.exit(1)

        buffer = ""
        while True:
            chunk = response.read(1)
            if not chunk:
                break

            char = chunk.decode('utf-8', errors='ignore')
            buffer += char

            if char == '\n':
                line = buffer.strip()
                buffer = ""

                if not line:
                    continue

                data = parse_sse_event(line)
                if not data:
                    continue

                formatted = format_event(data)
                if formatted:
                    print(formatted, end='', flush=True)

    except KeyboardInterrupt:
        print("\n" + "-" * 60)
        print("Stream stopped by user")
    except Exception as exc:
        print(f"Error connecting to server: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()


