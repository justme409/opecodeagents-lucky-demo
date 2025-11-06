#!/usr/bin/env node
/**
 * RERUN PQP GENERATION
 *
 * Convenience wrapper that executes the pqp-generation agent in isolation
 * using the latest prompt updates. Ensures the PROJECT_ID and Neo4j
 * connection settings are present before delegating to run-single-task.
 */

const { spawn } = require('child_process');
const path = require('path');

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

function usage() {
  console.log(`
Rerun PQP Generation (single agent)

Usage:
  node rerun-pqp-generation.js <projectId>

Environment variables used:
  PROJECT_ID (overridden by CLI argument)
  NEO4J_URI / NEO4J_GENERATED_URI (defaults neo4j://localhost:7690)
  NEO4J_USER / NEO4J_GENERATED_USERNAME (defaults neo4j)
  NEO4J_PASSWORD / NEO4J_GENERATED_PASSWORD (defaults from graphRAG/.env)

Example:
  node rerun-pqp-generation.js b168e975-2531-527f-9abd-19cb8f502fe0
`);
}

async function main() {
  const cliProjectId = process.argv[2];
  const projectId = (cliProjectId || process.env.PROJECT_ID || '').trim();

  if (!projectId) {
    usage();
    process.exit(1);
  }

  const env = { ...process.env };
  env.PROJECT_ID = projectId;
  env.NEO4J_URI = env.NEO4J_URI || env.NEO4J_GENERATED_URI || 'neo4j://localhost:7690';
  env.NEO4J_USER = env.NEO4J_USER || env.NEO4J_GENERATED_USERNAME || 'neo4j';
  env.NEO4J_PASSWORD = env.NEO4J_PASSWORD || env.NEO4J_GENERATED_PASSWORD || '27184236e197d5f4c36c60f453ebafd9';

  log(`Project ID: ${projectId}`);
  log(`Neo4j URI: ${env.NEO4J_URI}`);
  log(`Neo4j User: ${env.NEO4J_USER}`);
  log(`Launching pqp-generation agent with updated prompt...`);

  const child = spawn(
    'node',
    ['run-single-task.js', 'pqp-generation'],
    {
      cwd: __dirname,
      stdio: 'inherit',
      env,
    }
  );

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(`Failed to launch pqp-generation: ${err.message}`);
    process.exit(1);
  });
}

main();


