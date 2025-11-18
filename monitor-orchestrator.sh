#!/bin/bash

# Monitor the orchestrator progress

WORKSPACE="/app/opencode-workspace/pqp-orchestrator-1763279031278"

echo "Monitoring PQP Orchestrator Progress"
echo "====================================="
echo ""

while true; do
  clear
  echo "Monitoring PQP Orchestrator Progress"
  echo "====================================="
  echo ""
  
  echo "Files in workspace:"
  ls -lh "$WORKSPACE" | tail -n +2 | awk '{print $9, "-", $5}'
  echo ""
  
  echo "Neo4j Status:"
  echo "MATCH (mp:ManagementPlan {projectId: 'b168e975-2531-527f-9abd-19cb8f502fe0', type: 'PQP'}) OPTIONAL MATCH (mp)-[:HAS_SECTION]->(s) RETURN mp.title, count(s) as sections;" | cypher-shell -a neo4j://localhost:7690 -u neo4j -p 27184236e197d5f4c36c60f453ebafd9 2>/dev/null || echo "No data yet"
  echo ""
  
  echo "Active Sessions:"
  curl -s http://127.0.0.1:4096/session | jq -r '.[] | select(.title | contains("PQP") or contains("pqp")) | "\(.title) - Status: \(.status // "active")"' | head -5
  echo ""
  
  echo "Press Ctrl+C to exit. Refreshing in 10 seconds..."
  sleep 10
done

