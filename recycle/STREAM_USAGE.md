# Stream Usage Guide

## Quick Start

### Start the Stream Monitor
```bash
cd /app/opecodeagents-lucky-demo
python3 stream.py
```

This will connect to the opencode server and display all events in real-time.

### Run the Orchestrator
In another terminal:
```bash
cd /app/opecodeagents-lucky-demo
node orchestrate.js
```

## What You'll See

### Session Creation
```
Session: ses_abc123...
```

### Bash Commands
```
============================================================
[BASH] $ ls -la /workspace
============================================================
[OUTPUT]
total 48
drwxr-xr-x 5 user user 4096 Nov 3 10:00 .
...
------------------------------------------------------------
```

### File Operations
```
[READ] /path/to/file.txt
[WRITE] /path/to/output.txt
[EDIT] /path/to/file.js
[LIST] /workspace/dir
```

### Search Operations
```
[GREP] 'pattern' in /workspace
```

### Todo Updates
```
[TODOS] 3 items
  ○ Task 1
  ○ Task 2
  ✓ Task 3 (completed)
```

### Errors
```
Error: Error message here
```

## Tips

1. **Run stream in background**: Add `&` to run it in the background and redirect to a file:
   ```bash
   python3 stream.py > stream.log 2>&1 &
   ```

2. **Filter output**: Use grep to focus on specific events:
   ```bash
   python3 stream.py | grep -E '\[BASH\]|\[ERROR\]'
   ```

3. **Debug mode**: Use `stream-debug.py` to see ALL tool events with full details:
   ```bash
   python3 stream-debug.py
   ```

## Troubleshooting

### Stream stops after "Connected"
- Check that opencode server is running on port 4096
- Verify with: `curl http://127.0.0.1:4096/event`

### No bash commands showing
- Verify the AI is actually calling tools (not just outputting text)
- Check the prompt encourages tool usage
- Use `stream-debug.py` to see raw events

### Too much output
- The stream shows reasoning and verbose updates
- Edit `stream.py` to suppress more event types
- Or pipe through grep to filter

## Stream Output Format

The stream uses these visual separators:

- **Bash commands**: Surrounded by `====` lines (60 chars)
- **Output sections**: Ended with `----` lines (60 chars)
- **Tool calls**: Prefixed with `[TOOL_NAME]`
- **Errors**: Prefixed with `Error:`

All output is clean text with no emojis, designed to be easily readable and greppable.

