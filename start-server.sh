#!/bin/bash

# Change to the opencode workspace directory
cd /app/opencode-workspace || {
    echo "Error: Could not change to /app/opencode-workspace"
    exit 1
}

echo "Starting OpenCode server on port 4096..."
echo "Working directory: $(pwd)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start opencode server
opencode serve -p 4096

