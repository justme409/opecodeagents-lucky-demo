#!/bin/bash
WORKSPACE="/app/opencode-workspace/test-researcher-$(date +%s)"
mkdir -p "$WORKSPACE"

curl -s -X POST http://127.0.0.1:4096/session \
  -H "Content-Type: application/json" \
  -d "{\"workingDirectory\": \"$WORKSPACE\", \"title\": \"Test Researcher\"}" > /tmp/session.json

SESSION_ID=$(cat /tmp/session.json | jq -r '.id')
echo "Session: $SESSION_ID"
echo "Workspace: $WORKSPACE"

curl -s -X POST "http://127.0.0.1:4096/session/$SESSION_ID/message" \
  -H "Content-Type: application/json" \
  -d '{
    "parts": [{"type": "text", "text": "@pqp-researcher-v2 Extract PQP research data for project b168e975-2531-527f-9abd-19cb8f502fe0"}],
    "model": {"providerID": "openrouter", "modelID": "openrouter/sherlock-think-alpha"},
    "agent": "build"
  }'

echo ""
echo "Waiting for completion..."
sleep 10
ls -lah "$WORKSPACE"
