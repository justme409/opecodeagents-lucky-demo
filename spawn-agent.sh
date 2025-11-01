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

# Copy files
print_info "Copying required files..."
FILE_COUNT=0

while IFS= read -r file; do
    SOURCE_FILE="$SCRIPT_DIR/$file"
    
    if [ ! -f "$SOURCE_FILE" ]; then
        print_warning "File not found, skipping: $file"
        continue
    fi
    
    # Create subdirectories in workspace if needed
    DEST_FILE="$WORKSPACE_DIR/$file"
    DEST_DIR=$(dirname "$DEST_FILE")
    mkdir -p "$DEST_DIR"
    
    # Copy the file
    cp "$SOURCE_FILE" "$DEST_FILE"
    FILE_COUNT=$((FILE_COUNT + 1))
    echo "  - $file"
done <<< "$FILES"

print_success "Copied $FILE_COUNT files"
echo ""

# Rename the prompt file to prompt.md for consistency
PROMPT_SOURCE="$WORKSPACE_DIR/prompts/$TASK_NAME.md"
if [ -f "$PROMPT_SOURCE" ]; then
    mv "$PROMPT_SOURCE" "$WORKSPACE_DIR/prompt.md"
    print_success "Renamed prompt file to prompt.md"
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
1. Review prompt.md for task-specific instructions
2. Review shared/instructions.md for general workflow
3. Check shared/connection details.md for database access
4. Review schema files to understand input and output structures
5. Start exploring the databases using shared/Exploration guide.md
6. Generate output as Neo4j nodes in the Generated database (port 7690)

Database Access:
- Standards DB (READ):     neo4j://localhost:7687
- Project Docs DB (READ):  neo4j://localhost:7688
- Generated DB (WRITE):    neo4j://localhost:7690

EOF

print_success "Created session info file"
echo ""

# Create a README for the workspace
README_FILE="$WORKSPACE_DIR/README.md"
cat > "$README_FILE" << EOF
# Agent Workspace: $TASK_NAME

**Session ID:** $SESSION_ID  
**Created:** $(date)

## Task Description

$TASK_DESC

## Quick Start

1. **Read the task prompt:**
   \`\`\`
   cat prompt.md
   \`\`\`

2. **Review instructions:**
   \`\`\`
   cat shared/instructions.md
   \`\`\`

3. **Check database connections:**
   \`\`\`
   cat shared/connection\ details.md
   \`\`\`

4. **Explore databases:**
   - Follow guidance in \`shared/Exploration guide.md\`
   - Standards DB: \`neo4j://localhost:7687\` (READ ONLY)
   - Project Docs DB: \`neo4j://localhost:7688\` (READ ONLY)
   - Generated DB: \`neo4j://localhost:7690\` (WRITE)

5. **Review output schema:**
   - Check \`schemas/neo4j/*.schema.ts\` files
   - Understand required node structure
   - Follow property and relationship definitions

6. **Generate output:**
   - Write all output to Generated DB (port 7690)
   - Use Cypher CREATE statements
   - Follow the schema exactly

## Workspace Structure

\`\`\`
$WORKSPACE_DIR/
├── prompt.md                    # Your task-specific instructions
├── session-info.txt             # Session information
├── README.md                    # This file
├── shared/                      # Shared infrastructure files
│   ├── instructions.md
│   ├── connection details.md
│   ├── Exploration guide.md
│   ├── neo4j standards schema.md
│   ├── neo4j reference docs schema.md
│   └── neo4j generated schema.md
└── schemas/                     # Output schema definitions
    └── neo4j/
        └── *.schema.ts         # TypeScript schema files
\`\`\`

## Output Requirements

✅ **DO:**
- Write all output to Generated DB (port 7690)
- Use Cypher CREATE/MERGE statements
- Follow the schema exactly
- Validate your output before finalizing

❌ **DON'T:**
- Write to Standards or Project Docs databases
- Create JSON files
- Create Markdown output files
- Invent data not found in source documents

## Validation

Before finishing, validate your output:

\`\`\`cypher
// Connect to Generated DB
cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9

// Check node counts
MATCH (n:YourNodeType)
RETURN count(n)

// Verify relationships
MATCH (a)-[r:YOUR_RELATIONSHIP]->(b)
RETURN count(r)

// Check for missing required properties
MATCH (n:YourNodeType)
WHERE n.requiredProperty IS NULL
RETURN count(n)
\`\`\`

## Success Criteria

Your task is complete when:
- [ ] All required nodes are created in Generated DB
- [ ] All relationships are correctly established
- [ ] All required properties are set
- [ ] Output matches the schema exactly
- [ ] Validation queries return expected results
- [ ] All data is traceable to source documents

Good luck!
EOF

print_success "Created workspace README"
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
echo "  2. cat README.md"
echo "  3. cat prompt.md"
echo "  4. Start working on the task"
echo ""
echo "To trigger OpenCode agent (if configured):"
echo "  POST to OpenCode API with workspace path: $WORKSPACE_DIR"
echo ""
print_success "Done!"

