#!/usr/bin/env node
/**
 * Gemini File Search end-to-end demo.
 *
 * Steps:
 *   1. (Optionally) create a File Search store.
 *   2. Upload a real file and wait for ingestion.
 *   3. Ask a grounded question against that store and print citations.
 *
 * Requirements:
 *   - Set GEMINI_API_KEY in the environment.
 *   - Supply a real file path (no placeholders) when running the script.
 *   - Node.js 18+ (fetch/FormData/Blob available globally).
 *
 * Usage:
 *   node demo/gemini-file-search-demo.js <path-to-file> "<question to ask>"
 *
 * Optional environment variables:
 *   GEMINI_FILE_SEARCH_STORE            Re-use an existing store instead of creating a new one.
 *   GEMINI_FILE_SEARCH_STORE_DISPLAY    Display name to use when creating a new store.
 *   GEMINI_FILE_DISPLAY_NAME            Friendly name for the uploaded file (defaults to file basename).
 *   GEMINI_MAX_TOKENS_PER_CHUNK         Override chunk size (integer).
 *   GEMINI_MAX_OVERLAP_TOKENS           Override chunk overlap (integer).
 *   GEMINI_MODEL                        Model name (defaults to models/gemini-2.5-flash).
 *   GEMINI_API_BASE_URL                 Override the default https://generativelanguage.googleapis.com
 *
 * The script exits with code 1 on any error (fail fast, no fallbacks).
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  createGeminiClient,
  extractText,
  extractCitations,
} = require('./lib/gemini-file-search');

let client;
try {
  client = createGeminiClient();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

async function main() {
  const [filePath, question] = process.argv.slice(2);

  if (!filePath) {
    console.error('Usage: node demo/gemini-file-search-demo.js <path-to-file> "<question>"');
    process.exit(1);
  }

  if (!question) {
    console.error('Please provide a question to ask after the file is indexed.');
    process.exit(1);
  }

  const resolvedFilePath = path.resolve(filePath);
  if (!fs.existsSync(resolvedFilePath) || !fs.statSync(resolvedFilePath).isFile()) {
    console.error(`File not found: ${resolvedFilePath}`);
    process.exit(1);
  }

  const fileDisplayName = process.env.GEMINI_FILE_DISPLAY_NAME || path.basename(resolvedFilePath);
  const chunkingConfig = client.buildChunkingConfigFromEnv();

  let storeName = process.env.GEMINI_FILE_SEARCH_STORE;
  if (storeName) {
    console.log(`→ Using existing File Search store: ${storeName}`);
  } else {
    const displayName = process.env.GEMINI_FILE_SEARCH_STORE_DISPLAY
      || `demo-store-${new Date().toISOString()}`;
    console.log(`→ Creating File Search store (${displayName})...`);
    const store = await client.createFileSearchStore(displayName);
    storeName = store.name;
    console.log(`   Created store: ${storeName}`);
  }

  console.log(`→ Uploading ${resolvedFilePath} as "${fileDisplayName}"...`);
  const uploadOp = await client.uploadFileToStore({
    storeName,
    filePath: resolvedFilePath,
    displayName: fileDisplayName,
    chunkingConfig,
  });
  console.log(`   Upload operation: ${uploadOp.name}`);

  console.log('→ Waiting for ingestion to complete...');
  const ingested = await client.waitForOperation(uploadOp.name);
  if (!ingested.done || ingested.error) {
    throw new Error(`File ingestion failed: ${JSON.stringify(ingested)}`);
  }
  console.log('   Ingestion complete.');

  console.log(`→ Asking: ${question}`);
  const response = await client.generateGroundedAnswer({
    storeName,
    question,
  });

  renderAnswer(response);
}

function renderAnswer(response) {
  const candidate = response?.candidates?.[0];
  if (!candidate) {
    console.error('No candidates returned:', JSON.stringify(response, null, 2));
    process.exit(1);
  }

  const text = extractText(candidate);
  console.log('\n===== Answer =====\n');
  console.log(text || '(empty response)');

  const citations = extractCitations(candidate);
  if (citations.length > 0) {
    console.log('\n===== Citations =====\n');
    citations.forEach((ref, idx) => {
      console.log(`[${idx + 1}] ${ref}`);
    });
  } else {
    console.log('\n(No citations returned by the model.)');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
