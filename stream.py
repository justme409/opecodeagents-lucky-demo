#!/usr/bin/env python3
"""
Simple script to stream and display events from the opencode server.
Uses raw HTTP streaming for instant event delivery (no buffering).
"""

import json
import sys
import http.client
from urllib.parse import urlparse

BASE_URL = "http://127.0.0.1:4096"

def parse_sse_event(line):
    """Parse a Server-Sent Events line."""
    if line.startswith("data: "):
        return line[6:]  # Remove "data: " prefix
    return None

def format_event(event_data):
    """Format an event for display."""
    try:
        event = json.loads(event_data)
        event_type = event.get("type", "unknown")
        properties = event.get("properties", {})
        
        # Format based on event type
        if event_type == "server.connected":
            return "\nConnected to opencode server\n"
        
        elif event_type == "session.created":
            session_id = properties.get("info", {}).get("id", "unknown")
            return f"\nSession: {session_id}\n"
        
        elif event_type == "session.updated":
            return ""  # Suppress
        
        elif event_type == "message.updated":
            return ""  # Suppress
        
        elif event_type == "message.part.updated":
            part = properties.get("part", {})
            part_type = part.get("type", "unknown")
            delta = properties.get("delta", "")
            
            if part_type == "text":
                # Show LLM text responses (final summaries/responses)
                if delta:
                    return delta
                return ""
            
            elif part_type == "reasoning":
                # Show reasoning/thinking (this is where the model's actual thinking happens)
                text = part.get("text", "")
                
                # Show header when reasoning first starts (no prior text)
                if text and not delta and len(text) < 50:
                    return f"\n{'='*60}\n[REASONING]\n{'='*60}\n"
                
                # Show the reasoning deltas (the actual thinking)
                if delta:
                    return delta
                
                return ""
            
            elif part_type == "tool":
                tool_name = part.get("tool", "unknown")
                state_info = part.get("state", {})
                status = state_info.get("status", "unknown")
                tool_input = state_info.get("input", {})
                
                # Show tool call when it FIRST starts running
                # The input is populated when status becomes "running"
                # Only show on first "running" event (when metadata doesn't exist yet)
                if status == "running" and tool_input and "metadata" not in state_info:
                    # Format tool call with full details
                    if tool_name == "bash":
                        cmd = tool_input.get("command", "")
                        if cmd:
                            return f"\n{'='*60}\n[BASH] $ {cmd}\n{'='*60}\n"
                        return ""
                    
                    elif tool_name == "read":
                        path = tool_input.get("path", "")
                        if path:
                            return f"\n[READ] {path}\n"
                        return ""
                    
                    elif tool_name == "write":
                        path = tool_input.get("path", "")
                        if path:
                            return f"\n[WRITE] {path}\n"
                        return ""
                    
                    elif tool_name == "edit":
                        path = tool_input.get("path", "")
                        if path:
                            return f"\n[EDIT] {path}\n"
                        return ""
                    
                    elif tool_name == "list":
                        path = tool_input.get("path", ".")
                        return f"\n[LIST] {path}\n"
                    
                    elif tool_name == "grep":
                        pattern = tool_input.get("pattern", "")
                        path = tool_input.get("path", "")
                        if pattern:
                            return f"\n[GREP] '{pattern}' in {path}\n"
                        return ""
                    
                    elif tool_name == "todowrite":
                        todos = tool_input.get("todos", [])
                        if todos:
                            result = f"\n[TODOS] {len(todos)} items\n"
                            for todo in todos:
                                status_icon = "✓" if todo.get("status") == "completed" else "○"
                                content = todo.get("content", "")
                                result += f"  {status_icon} {content}\n"
                            return result
                        return ""
                    
                    else:
                        return f"\n[{tool_name.upper()}]\n"
                
                elif status == "completed":
                    output = state_info.get("output", "")
                    
                    # Show bash output
                    if tool_name == "bash":
                        if output.strip():
                            lines = output.strip().split('\n')
                            if len(lines) > 10:
                                preview = '\n'.join(lines[:10]) + f"\n... ({len(lines)} lines total)"
                            else:
                                preview = output.strip()
                            return f"[OUTPUT]\n{preview}\n{'-'*60}\n"
                        return f"[OUTPUT] (empty)\n{'-'*60}\n"
                    
                    # Show read output (file contents preview)
                    elif tool_name == "read":
                        if output.strip():
                            lines = output.strip().split('\n')
                            if len(lines) > 10:
                                preview = '\n'.join(lines[:10]) + f"\n... ({len(lines)} lines total)"
                            else:
                                preview = output.strip()
                            return f"{preview}\n"
                        return ""
                    
                    # Show list output
                    elif tool_name == "list":
                        if output.strip():
                            return f"{output.strip()}\n"
                        return ""
                    
                    # Don't show output for write/edit/todowrite
                    return ""
                
                elif status == "error":
                    error = state_info.get("error", "Unknown error")
                    return f"\nError: {error}\n"
                
                return ""
            
            elif part_type == "step-start":
                return ""  # Suppress
            
            elif part_type == "step-finish":
                return "\n"  # Just a newline between steps
            
            else:
                return ""
        
        elif event_type == "todo.updated":
            return ""  # Suppress
        
        elif event_type == "session.idle":
            return "\n"
        
        elif event_type == "session.error":
            error = properties.get("error", {})
            error_msg = error.get("data", {}).get("message", "Unknown error")
            return f"\nError: {error_msg}\n"
        
        elif event_type == "permission.updated":
            perm = properties
            perm_type = perm.get("type", "unknown")
            title = perm.get("title", "")
            pattern = perm.get("pattern", "")
            if isinstance(pattern, list):
                pattern = " ".join(pattern)
            return f"\nPermission required: {title}\n  {pattern}\n"
        
        else:
            return ""
    
    except json.JSONDecodeError:
        # Silently ignore JSON decode errors (likely incomplete/malformed SSE data)
        return ""
    except Exception as e:
        # Only show unexpected errors
        return ""

def main():
    print("Connecting to opencode event stream...")
    print(f"URL: {BASE_URL}/event")
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
                        formatted = format_event(data)
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

