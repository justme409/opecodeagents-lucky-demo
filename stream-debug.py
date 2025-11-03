#!/usr/bin/env python3
"""
Debug version of stream.py that shows ALL tool events
"""
import requests
import json

BASE_URL = "http://127.0.0.1:4096"

def main():
    print("Connecting to opencode event stream...")
    print(f"URL: {BASE_URL}/event")
    print("Press Ctrl+C to stop\n")
    print("-" * 60)
    print()
    
    response = requests.get(
        f"{BASE_URL}/event",
        stream=True,
        headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache"
        },
        timeout=None
    )
    
    for line in response.iter_lines(decode_unicode=True, chunk_size=1):
        if line and line.startswith("data: "):
            try:
                event = json.loads(line[6:])
                event_type = event.get("type", "")
                
                if event_type == "server.connected":
                    print("Connected to opencode server\n")
                
                elif event_type == "session.created":
                    sid = event.get("properties", {}).get("info", {}).get("id")
                    print(f"Session: {sid}\n")
                
                elif event_type == "message.part.updated":
                    part = event.get("properties", {}).get("part", {})
                    part_type = part.get("type")
                    delta = event.get("properties", {}).get("delta", "")
                    
                    if part_type == "text" and delta:
                        print(delta, end="", flush=True)
                    
                    elif part_type == "tool":
                        tool_name = part.get("tool")
                        state = part.get("state", {})
                        status = state.get("status")
                        
                        print(f"\n\n[DEBUG] Tool Event:")
                        print(f"  Tool: {tool_name}")
                        print(f"  Status: {status}")
                        print(f"  State keys: {list(state.keys())}")
                        
                        if "input" in state:
                            print(f"  Input: {json.dumps(state['input'], indent=4)}")
                        
                        if status == "pending" and tool_name == "bash":
                            cmd = state.get("input", {}).get("command", "")
                            if cmd:
                                print(f"\n{'='*60}")
                                print(f"[BASH] $ {cmd}")
                                print(f"{'='*60}\n")
                        
                        elif status == "completed":
                            output = state.get("output", "")
                            if output and tool_name == "bash":
                                print(f"\n[OUTPUT]\n{output[:500]}")
                                if len(output) > 500:
                                    print(f"... ({len(output)} chars total)")
                                print(f"{'-'*60}\n")
                        
                        print()
                
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"\n[ERROR] {e}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nStopped.")

