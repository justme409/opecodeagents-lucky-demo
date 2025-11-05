#!/usr/bin/env python3
"""
Simple script to stream and display events from the opencode server.
Uses raw HTTP streaming for instant event delivery (no buffering).
"""

import argparse
import json
import sys
import http.client
from urllib.parse import urlparse
from typing import Any, Dict, Optional, Set

BASE_URL = "http://127.0.0.1:4096"

def parse_sse_event(line):
    """Parse a Server-Sent Events line."""
    if line.startswith("data: "):
        return line[6:]  # Remove "data: " prefix
    return None

def _search_project_id(payload: Any) -> Optional[str]:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key.lower() == "projectid" and isinstance(value, str):
                return value
            found = _search_project_id(value)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _search_project_id(item)
            if found:
                return found
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
        state = part.get("state")
        if isinstance(state, dict):
            session_id = state.get("sessionID") or state.get("sessionId")
            if session_id:
                return session_id

    return None


def extract_project_id(event: Dict[str, Any]) -> Optional[str]:
    properties = event.get("properties") or {}
    direct = properties.get("projectId") or properties.get("project_id")
    if isinstance(direct, str) and direct.strip():
        return direct
    return _search_project_id(properties)


def build_prefix(session_id: Optional[str], project_id: Optional[str]) -> str:
    if session_id and project_id:
        return f"[session {session_id} | project {project_id}]"
    if session_id:
        return f"[session {session_id}]"
    if project_id:
        return f"[project {project_id}]"
    return "[server]"


def parse_cli_args() -> Dict[str, Set[str]]:
    parser = argparse.ArgumentParser(description="Stream OpenCode events with session-aware output")
    parser.add_argument(
        "--session",
        dest="sessions",
        action="append",
        default=[],
        help="Filter by session ID (comma separated or repeat option)",
    )
    parser.add_argument(
        "--type",
        dest="types",
        action="append",
        default=[],
        help="Filter by event type (e.g. message.part.updated)",
    )

    args = parser.parse_args()

    def _collect(values: Any) -> Set[str]:
        collected: Set[str] = set()
        for value in values or []:
            if not value:
                continue
            for part in str(value).split(","):
                item = part.strip()
                if item:
                    collected.add(item)
        return collected

    return {
        "sessions": _collect(args.sessions),
        "types": _collect(args.types),
    }


def format_event(event_data: str, filters: Dict[str, Set[str]]) -> str:
    """Format an event for display."""
    try:
        event = json.loads(event_data)
    except json.JSONDecodeError:
        return ""

    event_type = event.get("type", "unknown")
    properties = event.get("properties", {})
    session_id = extract_session_id(event)
    project_id = extract_project_id(event)

    if filters["sessions"] and (session_id is None or session_id not in filters["sessions"]):
        return ""

    if filters["types"] and event_type not in filters["types"]:
        return ""

    leader = build_prefix(session_id, project_id)

    try:
        if event_type == "server.connected":
            return f"{leader} connected\n"

        if event_type == "session.created":
            info = properties.get("info", {})
            title = info.get("title", "")
            return f"{leader} session created {title}\n"

        if event_type == "session.updated" or event_type == "message.updated":
            return ""

        if event_type == "session.idle":
            return f"{leader} idle\n"

        if event_type == "session.error":
            error = properties.get("error", {})
            message = error.get("data", {}).get("message", "Unknown error")
            return f"{leader} error: {message}\n"

        if event_type == "permission.updated":
            title = properties.get("title", "permission")
            pattern = properties.get("pattern", "")
            if isinstance(pattern, list):
                pattern = " ".join(pattern)
            return f"{leader} permission requested: {title} {pattern}\n"

        if event_type == "todo.updated":
            todos = properties.get("todos", [])
            return f"{leader} todo updated ({len(todos)} items)\n"

        if event_type == "message.part.updated":
            part = properties.get("part", {})
            part_type = part.get("type", "unknown")
            delta = properties.get("delta", "")

            if part_type == "text":
                if not delta:
                    return ""
                text_delta = delta if delta.endswith("\n") else f"{delta}\n"
                return f"{leader} text: {text_delta}"

            if part_type == "reasoning":
                if delta:
                    reasoning_delta = delta if delta.endswith("\n") else f"{delta}\n"
                    return f"{leader} reasoning: {reasoning_delta}"
                text = part.get("text", "")
                if text:
                    return f"{leader} reasoning-start {text}\n"
                return ""

            if part_type == "tool":
                tool_name = part.get("tool", "unknown")
                state_info = part.get("state", {})
                status = state_info.get("status", "unknown")
                tool_input = state_info.get("input", {})

                if status == "running" and tool_input and "metadata" not in state_info:
                    summary = json.dumps(tool_input, ensure_ascii=True) if tool_input else ""
                    if len(summary) > 200:
                        summary = summary[:200] + "..."
                    return f"{leader} tool {tool_name} running {summary}\n"

                if status == "completed":
                    output = state_info.get("output", "")
                    if isinstance(output, str) and output.strip():
                        lines = output.strip().split('\n')
                        preview = '\n'.join(lines[:10])
                        if len(lines) > 10:
                            preview += f"\n... ({len(lines)} lines total)"
                        return f"{leader} tool {tool_name} output\n{preview}\n"
                    return f"{leader} tool {tool_name} completed (no output)\n"

                if status == "error":
                    error_msg = state_info.get("error", "Unknown tool error")
                    return f"{leader} tool {tool_name} error: {error_msg}\n"

                return ""

            if part_type == "step-start" or part_type == "step-finish":
                return ""

            return ""

        return ""

    except Exception:
        return ""

def main():
    filters = parse_cli_args()

    print("Connecting to opencode event stream...")
    print(f"URL: {BASE_URL}/event")
    if filters["sessions"]:
        print(f"Filter sessions: {', '.join(sorted(filters['sessions']))}")
    if filters["types"]:
        print(f"Filter event types: {', '.join(sorted(filters['types']))}")
    print("Press Ctrl+C to stop\n")
    print("-" * 60)
    
    try:
        # Parse URL
        parsed = urlparse(BASE_URL)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 4096
        
        # Use raw HTTP connection for instant streaming (no buffering)
        conn = http.client.HTTPConnection(host, port)
        conn.request("GET", "/event", headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache"
        })
        
        response = conn.getresponse()
        if response.status != 200:
            print(f"Error: Server returned status {response.status}")
            exit(1)
        
        # Read byte-by-byte until we hit newline, then process
        # This matches the Node.js behavior exactly
        buffer = ""
        while True:
            # Read one byte at a time for instant delivery
            chunk = response.read(1)
            if not chunk:
                break
            
            char = chunk.decode('utf-8', errors='ignore')
            buffer += char
            
            # Process complete lines
            if char == '\n':
                line = buffer.strip()
                buffer = ""
                
                if line:  # Only process non-empty lines
                    # Parse SSE format
                    data = parse_sse_event(line)
                    if data:
                        # Format and print the event
                        formatted = format_event(data, filters)
                        if formatted:  # Only print if there's content
                            print(formatted, end='', flush=True)
    
    except KeyboardInterrupt:
        print("\n" + "-" * 60)
        print("Stream stopped by user")
    except Exception as e:
        print(f"Error connecting to server: {e}")
        exit(1)

if __name__ == "__main__":
    main()

