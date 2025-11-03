#!/bin/bash

# Monitor Orchestrator Progress
# Shows real-time status of the orchestrator execution

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Orchestrator Progress Monitor                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Find the latest log file
LOG_FILE=$(ls -t /tmp/orchestrator-run-*.log 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
    echo "❌ No orchestrator log file found"
    exit 1
fi

echo "📄 Log file: $LOG_FILE"
echo ""

# Check if orchestrator is running
if ps aux | grep "orchestrator.js" | grep -v grep > /dev/null; then
    echo "✅ Orchestrator is RUNNING"
else
    echo "⚠️  Orchestrator is NOT running"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Recent Activity:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show last 30 lines, filtering for important events
tail -50 "$LOG_FILE" | grep -E "(Starting task|✓|✗|Executing|Workspace created|Server started|Logs saved)" | tail -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Workspaces Created:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ls -lt /app/opencode-workspace/agent-sessions/ 2>/dev/null | head -10

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Watch live:     tail -f $LOG_FILE"
echo "  View logs:      cat $LOG_FILE"
echo "  Check status:   ./monitor-orchestrator.sh"
echo ""

