#!/bin/bash

# Spawn PQP Orchestrator Workspace
# Creates a workspace with shared files and orchestrator prompt

set -e

WORKSPACE_BASE="/app/opencode-workspace/pqp-orchestrator"
SESSION_ID="$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 3)"
WORKSPACE_DIR="${WORKSPACE_BASE}-${SESSION_ID}"

# Create workspace
mkdir -p "$WORKSPACE_DIR"

# Copy shared files
cp /app/opecodeagents-lucky-demo/shared/*.md "$WORKSPACE_DIR/" 2>/dev/null || true

# Copy orchestrator prompt as prompt.md
cp /app/opecodeagents-lucky-demo/prompts/pqp-orchestrator.md "$WORKSPACE_DIR/prompt.md"

# Create session info
cat > "$WORKSPACE_DIR/session-info.txt" << EOF
Task: PQP Orchestrator
Session ID: $SESSION_ID
Workspace: $WORKSPACE_DIR
Created: $(date -Iseconds)
EOF

# Output for parsing
echo "Session ID: $SESSION_ID"
echo "Workspace: $WORKSPACE_DIR"

