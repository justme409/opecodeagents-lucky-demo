#!/bin/bash

# OpenCode Agent Workspace Spawner
# Creates a unique workspace for an agent task with all required files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory (where manifest.json lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Workspace base directory
WORKSPACE_BASE="/app/opencode-workspace/agent-sessions"

# Manifest file
MANIFEST_FILE="$SCRIPT_DIR/manifest.json"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <task-name>"
    echo ""
    echo "Available tasks:"
    jq -r '.tasks | keys[]' "$MANIFEST_FILE" | sed 's/^/  - /'
    echo ""
    echo "Example:"
    echo "  $0 itp-generation"
    exit 1
}

# Check arguments
if [ $# -eq 0 ]; then
    print_error "No task name provided"
    show_usage
fi

TASK_NAME="$1"

# Check if manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
    print_error "Manifest file not found: $MANIFEST_FILE"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Please install jq to use this script."
    exit 1
fi

# Validate task exists in manifest
if ! jq -e ".tasks.\"$TASK_NAME\"" "$MANIFEST_FILE" > /dev/null 2>&1; then
    print_error "Task '$TASK_NAME' not found in manifest"
    echo ""
    echo "Available tasks:"
    jq -r '.tasks | keys[]' "$MANIFEST_FILE" | sed 's/^/  - /'
    exit 1
fi

# Generate unique session ID (timestamp + random)
SESSION_ID="$(date +%Y%m%d-%H%M%S)-$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 6)"
WORKSPACE_DIR="$WORKSPACE_BASE/$SESSION_ID"

print_info "Task: $TASK_NAME"
print_info "Session ID: $SESSION_ID"
print_info "Workspace: $WORKSPACE_DIR"
echo ""

# Get task description
TASK_DESC=$(jq -r ".tasks.\"$TASK_NAME\".description" "$MANIFEST_FILE")
print_info "Task Description: $TASK_DESC"
echo ""

# Create workspace directory
print_info "Creating workspace directory..."
mkdir -p "$WORKSPACE_DIR"
print_success "Workspace directory created"

# Get list of files to copy
FILES=$(jq -r ".tasks.\"$TASK_NAME\".files[]" "$MANIFEST_FILE")

# Copy files directly to workspace root (no shared/ or prompts/ folders)
print_info "Copying required files..."
FILE_COUNT=0

while IFS= read -r file; do
    SOURCE_FILE="$SCRIPT_DIR/$file"
    
    if [ ! -f "$SOURCE_FILE" ]; then
        print_warning "File not found, skipping: $file"
        continue
    fi
    
    # Extract filename, removing shared/ or prompts/ prefix
    if [[ "$file" == shared/* ]]; then
        DEST_FILE="$WORKSPACE_DIR/$(basename "$file")"
    elif [[ "$file" == prompts/* ]]; then
        DEST_FILE="$WORKSPACE_DIR/prompt.md"
    else
        DEST_FILE="$WORKSPACE_DIR/$(basename "$file")"
    fi
    
    # Copy the file
    cp "$SOURCE_FILE" "$DEST_FILE"
    FILE_COUNT=$((FILE_COUNT + 1))
    echo "  - $(basename "$DEST_FILE")"
done <<< "$FILES"

print_success "Copied $FILE_COUNT files"
echo ""

# Generate schema files
print_info "Generating schema documentation..."
if [ -f "$SCRIPT_DIR/extract-agent-schema.js" ]; then
    node "$SCRIPT_DIR/extract-agent-schema.js" "$TASK_NAME" > "$WORKSPACE_DIR/AGENT_SCHEMA.md"
    print_success "Generated AGENT_SCHEMA.md"
else
    print_warning "Agent schema extractor not found, skipping"
fi

# Create a session info file
SESSION_INFO_FILE="$WORKSPACE_DIR/session-info.txt"
cat > "$SESSION_INFO_FILE" << EOF
OpenCode Agent Session
======================

Session ID: $SESSION_ID
Task: $TASK_NAME
Description: $TASK_DESC
Created: $(date)

Workspace Location:
$WORKSPACE_DIR

Files Included:
$(find "$WORKSPACE_DIR" -type f -not -path '*/.*' | sort | sed 's|'"$WORKSPACE_DIR"'/|  - |')

Instructions:
1. Review instructions.md for detailed workflow and guidance
2. Check connection details.md for database access
3. Review schema files to understand input and output structures
4. Use Writing to Generated DB.md for execution patterns
5. Generate output as Neo4j nodes in the Generated database (port 7690)

Database Access:
- Standards DB (READ):     neo4j://localhost:7687
- Project Docs DB (READ):  neo4j://localhost:7688
- Generated DB (WRITE):    neo4j://localhost:7690

EOF

print_success "Created session info file"
echo ""

# Print summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   WORKSPACE READY                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
print_success "Workspace created successfully!"
echo ""
echo "Session ID: $SESSION_ID"
echo "Location: $WORKSPACE_DIR"
echo ""
echo "Next Steps:"
echo "  1. cd $WORKSPACE_DIR"
echo "  2. cat $SCRIPT_DIR/shared/instructions.md"
echo "  3. Follow the workflow documented in that file"
echo ""
echo "To trigger OpenCode agent (if configured):"
echo "  POST to OpenCode API with workspace path: $WORKSPACE_DIR"
echo ""
print_success "Done!"

