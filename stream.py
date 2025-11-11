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
from typing import Any, Dict, List, Optional, Set

BASE_URL = "http://127.0.0.1:4096"

# Maintain in-flight text/reasoning parts so we can emit them once finished
_TEXT_PART_BUFFERS: Dict[str, Dict[str, Any]] = {}

# Track active tool parts to capture outputs when they complete
_ACTIVE_TOOLS: Dict[str, Dict[str, Any]] = {}  # partId -> { tool, input, startTime }
_COMPLETED_TOOLS: Dict[str, Dict[str, Any]] = {}  # partId -> { tool, output, error } for updating output if it arrives later

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


def _text_part_key(session_id: Optional[str], part: Dict[str, Any]) -> str:
    part_id = part.get("id")
    if isinstance(part_id, str) and part_id:
        return part_id

    message_id = part.get("messageID") or part.get("messageId") or "unknown-message"
    index = part.get("index")
    if index is None:
        index = "unknown-index"

    return f"{session_id or 'server'}::{message_id}::{index}"


def _update_text_buffer(
    key: str,
    session_id: Optional[str],
    project_id: Optional[str],
    part_type: str,
    text_value: Optional[str],
) -> None:
    buffer = _TEXT_PART_BUFFERS.get(key, {})
    buffer["session_id"] = session_id
    buffer["project_id"] = project_id
    buffer["part_type"] = part_type
    if text_value is not None:
        buffer["text"] = text_value
    elif "text" not in buffer:
        buffer["text"] = ""
    _TEXT_PART_BUFFERS[key] = buffer


def _format_buffer_payload(payload: Dict[str, Any]) -> str:
    text_out = payload.get("text", "") or ""
    if not text_out:
        return ""

    leader = build_prefix(payload.get("session_id"), payload.get("project_id"))
    part_type = payload.get("part_type")
    
    if part_type == "reasoning":
        emoji = "🧠"
        label = "reasoning"
        separator = "─" * 60
    else:
        emoji = "💭"
        label = "text"
        separator = "─" * 60
    
    if not text_out.endswith("\n"):
        text_out += "\n"
    
    return f"\n{separator}\n{leader} {emoji} {label.upper()}\n{separator}\n{text_out}\n"


def _emit_buffer_for_key(key: str) -> str:
    payload = _TEXT_PART_BUFFERS.pop(key, None)
    if not payload:
        return ""
    return _format_buffer_payload(payload)


def _flush_session_buffers(session_id: Optional[str]) -> str:
    if not session_id:
        return ""

    outputs: List[str] = []
    keys_to_flush = [
        key for key, payload in _TEXT_PART_BUFFERS.items()
        if payload.get("session_id") == session_id
    ]

    for key in keys_to_flush:
        emitted = _emit_buffer_for_key(key)
        if emitted:
            outputs.append(emitted)

    return "".join(outputs)


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
            return f"\n{'=' * 60}\n{leader} ✅ connected\n{'=' * 60}\n"

        if event_type == "session.created":
            info = properties.get("info", {})
            title = info.get("title", "")
            return f"\n{'=' * 60}\n{leader} 🚀 session created: {title}\n{'=' * 60}\n"

        if event_type == "session.updated" or event_type == "message.updated":
            return ""

        if event_type == "session.idle":
            buffered = _flush_session_buffers(session_id)
            return f"{buffered}\n{'=' * 60}\n{leader} ✅ session idle\n{'=' * 60}\n"

        if event_type == "session.error":
            error = properties.get("error", {})
            message = error.get("data", {}).get("message", "Unknown error")
            buffered = _flush_session_buffers(session_id)
            return f"{buffered}\n{'=' * 60}\n{leader} ❌ ERROR: {message}\n{'=' * 60}\n"

        if event_type == "permission.updated":
            title = properties.get("title", "permission")
            pattern = properties.get("pattern", "")
            if isinstance(pattern, list):
                pattern = " ".join(pattern)
            return f"{leader} 🔐 permission requested: {title} {pattern}\n"

        if event_type == "todo.updated":
            todos = properties.get("todos", [])
            return f"{leader} 📋 todo updated ({len(todos)} items)\n"

        if event_type == "message.part.updated":
            part = properties.get("part", {})
            part_type = part.get("type", "unknown")
            part_id = part.get("id")
            delta = properties.get("delta")
            
            # Check if this is a final update (delta is null/empty means complete)
            is_final = delta is None or (isinstance(delta, str) and not delta)

            if part_type in {"text", "reasoning"}:
                key = _text_part_key(session_id, part)
                _update_text_buffer(key, session_id, project_id, part_type, part.get("text"))

                # Only emit when delta is null/empty (final update)
                # The part.text contains the FULL text, not just the delta
                if not is_final:
                    return ""

                emitted = _emit_buffer_for_key(key)
                return emitted

            if part_type == "tool":
                tool_name = part.get("tool", "unknown")
                state_info = part.get("state", {})
                status = state_info.get("status", "unknown")
                tool_input = state_info.get("input", {})

                if status == "running" and part_id and part_id not in _ACTIVE_TOOLS:
                    # Tool started - track it
                    _ACTIVE_TOOLS[part_id] = {
                        "tool": tool_name,
                        "input": tool_input,
                        "startTime": None  # We don't track time in Python version
                    }
                    
                    # Choose emoji based on tool type
                    tool_emoji = {
                        "bash": "💻",
                        "read": "📖",
                        "write": "✍️",
                        "edit": "✏️",
                        "list": "📁",
                        "grep": "🔍",
                        "glob": "🔎",
                        "task": "🎯",
                        "todowrite": "📝"
                    }.get(tool_name, "🔧")
                    
                    if tool_input and "metadata" not in state_info:
                        summary = json.dumps(tool_input, ensure_ascii=True) if tool_input else ""
                        if len(summary) > 200:
                            summary = summary[:200] + "..."
                        return f"\n{leader} {tool_emoji} [{tool_name.upper()}] running\n{summary}\n"
                    return f"\n{leader} {tool_emoji} [{tool_name.upper()}] running\n"

                if status == "completed" or status == "failed":
                    # Tool completed - get output from multiple locations
                    output = state_info.get("output", "")
                    
                    # For bash commands, also check metadata
                    if tool_name == "bash" and not output and state_info.get("metadata"):
                        metadata = state_info.get("metadata", {})
                        output = metadata.get("output") or metadata.get("stdout") or metadata.get("stderr") or ""
                    
                    error = state_info.get("error", "")
                    
                    # Check if we've already logged this tool completion (output might arrive later)
                    if part_id and part_id in _COMPLETED_TOOLS:
                        # Update existing entry with latest output/error
                        existing = _COMPLETED_TOOLS[part_id]
                        had_output = bool(existing.get("output"))
                        had_error = bool(existing.get("error"))
                        
                        # Update stored values
                        if output:
                            existing["output"] = output
                        if error:
                            existing["error"] = error
                        
                        # If we now have output/error that we didn't have before, emit it
                        if (output and not had_output) or (error and not had_error):
                            tool_emoji = {
                                "bash": "💻",
                                "read": "📖",
                                "write": "✍️",
                                "edit": "✏️",
                                "list": "📁",
                                "grep": "🔍",
                                "glob": "🔎",
                                "task": "🎯",
                                "todowrite": "📝"
                            }.get(tool_name, "🔧")
                            
                            result_lines = []
                            separator = "─" * 60
                            
                            if error:
                                error_msg = error or "Unknown tool error"
                                result_lines.append(f"\n{separator}\n{leader} {tool_emoji} [{tool_name.upper()}] ❌ ERROR\n{separator}\n{error_msg}\n{separator}\n")
                            elif output and isinstance(output, str) and output.strip():
                                lines = output.strip().split('\n')
                                max_lines = 30 if tool_name == "bash" else 15
                                preview = '\n'.join(lines[:max_lines])
                                if len(lines) > max_lines:
                                    preview += f"\n... ({len(lines)} lines total)"
                                result_lines.append(f"\n{separator}\n{leader} {tool_emoji} [{tool_name.upper()}] ✅ OUTPUT\n{separator}\n{preview}\n{separator}\n")
                            return "".join(result_lines)
                        
                        # Already showed it and no new info
                        return ""
                    
                    # Choose emoji based on tool type
                    tool_emoji = {
                        "bash": "💻",
                        "read": "📖",
                        "write": "✍️",
                        "edit": "✏️",
                        "list": "📁",
                        "grep": "🔍",
                        "glob": "🔎",
                        "task": "🎯",
                        "todowrite": "📝"
                    }.get(tool_name, "🔧")
                    
                    # Build output message
                    result_lines = []
                    separator = "─" * 60
                    
                    if status == "failed":
                        error_msg = error or "Unknown tool error"
                        result_lines.append(f"\n{separator}\n{leader} {tool_emoji} [{tool_name.upper()}] ❌ ERROR\n{separator}\n{error_msg}\n{separator}\n")
                    else:
                        if isinstance(output, str) and output.strip():
                            lines = output.strip().split('\n')
                            # Show more lines for bash commands (they're important)
                            max_lines = 30 if tool_name == "bash" else 15
                            preview = '\n'.join(lines[:max_lines])
                            if len(lines) > max_lines:
                                preview += f"\n... ({len(lines)} lines total)"
                            result_lines.append(f"\n{separator}\n{leader} {tool_emoji} [{tool_name.upper()}] ✅ OUTPUT\n{separator}\n{preview}\n{separator}\n")
                        else:
                            result_lines.append(f"\n{leader} {tool_emoji} [{tool_name.upper()}] ✅ completed (no output)\n")
                    
                    # Track completed tool for potential output updates
                    if part_id:
                        _COMPLETED_TOOLS[part_id] = {
                            "tool": tool_name,
                            "output": output,
                            "error": error
                        }
                    
                    # Clean up active tracking
                    if part_id and part_id in _ACTIVE_TOOLS:
                        del _ACTIVE_TOOLS[part_id]
                    
                    return "".join(result_lines)

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

