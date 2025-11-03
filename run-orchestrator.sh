#!/bin/bash

# OpenCode Agent Orchestrator Runner
# Simple wrapper to run the orchestrator with proper environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          OpenCode Agent Orchestrator                           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js to run the orchestrator"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo ""

# Check if OpenCode server is available
if ! command -v opencode &> /dev/null; then
    echo -e "${RED}✗ OpenCode is not installed${NC}"
    echo "Please install OpenCode first"
    exit 1
fi

echo -e "${GREEN}✓ OpenCode found${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR="$SCRIPT_DIR/orchestrator.js"

# Check if orchestrator exists
if [ ! -f "$ORCHESTRATOR" ]; then
    echo -e "${RED}✗ Orchestrator not found: $ORCHESTRATOR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Orchestrator found${NC}"
echo ""

# Set environment variables
export OPENCODE_PORT=${OPENCODE_PORT:-4096}
export OPENCODE_HOST=${OPENCODE_HOST:-127.0.0.1}

echo -e "${BLUE}Configuration:${NC}"
echo "  OpenCode Host: $OPENCODE_HOST"
echo "  Starting Port: $OPENCODE_PORT"
echo "  Workspace Base: /app/opencode-workspace/agent-sessions"
echo "  Log Directory: /app/opencode-workspace/orchestrator-logs"
echo ""

# Confirm execution
if [ "$1" != "--yes" ] && [ "$1" != "-y" ]; then
    echo -e "${YELLOW}This will execute all agent tasks in sequence.${NC}"
    echo -e "${YELLOW}This may take a significant amount of time.${NC}"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

echo ""
echo -e "${CYAN}Starting orchestration...${NC}"
echo ""

# Run the orchestrator
node "$ORCHESTRATOR"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Orchestration completed successfully${NC}"
else
    echo -e "${RED}✗ Orchestration failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE

