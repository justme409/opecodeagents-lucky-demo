#!/usr/bin/env node
/**
 * Batch Gemini File Search runner.
 *
 * • Uploads every supported file in a target directory (no mocks, real files only)
 * • Waits for each ingestion job to finish
 * • Executes a series of grounded questions against the resulting store
 *
 * Usage:
 *   node demo/gemini-file-search-batch.js <absolute-directory> [question 1] [question 2] [...]
 *
 * Environment:
 *   GEMINI_API_KEY                 Required.
 *   GEMINI_FILE_SEARCH_STORE       Optional. Re-use an existing store ID.
 *   GEMINI_FILE_SEARCH_STORE_DISPLAY Optional. Display name when creating a new store.
 *   GEMINI_MODEL                   Optional. Defaults to models/gemini-2.5-flash.
 *   GEMINI_MAX_TOKENS_PER_CHUNK    Optional.
 *   GEMINI_MAX_OVERLAP_TOKENS      Optional.
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
  const [directory, ...questionsFromCli] = process.argv.slice(2);

  if (!directory) {
    console.error('Usage: node demo/gemini-file-search-batch.js <absolute-directory> [question ...]');
    process.exit(1);
  }

  const resolvedDir = path.resolve(directory);
  const stat = safeStat(resolvedDir);
  if (!stat || !stat.isDirectory()) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const files = prepareFileList(resolvedDir);
  if (files.length === 0) {
    console.error(`No files found in ${resolvedDir}`);
    process.exit(1);
  }

  const chunkingConfig = client.buildChunkingConfigFromEnv();

  let storeName = process.env.GEMINI_FILE_SEARCH_STORE;
  if (storeName) {
    console.log(`→ Using existing File Search store: ${storeName}`);
  } else {
    const displayName = process.env.GEMINI_FILE_SEARCH_STORE_DISPLAY
      || `batch-store-${new Date().toISOString()}`;
    console.log(`→ Creating File Search store (${displayName})...`);
    const store = await client.createFileSearchStore(displayName);
    storeName = store.name;
    console.log(`   Created store: ${storeName}`);
  }

  for (const filePath of files) {
    const displayName = path.basename(filePath);
    console.log(`→ Uploading ${filePath} as "${displayName}"...`);
    const op = await client.uploadFileToStore({
      storeName,
      filePath,
      displayName,
      chunkingConfig,
    });
    console.log(`   Upload operation: ${op.name}`);
    const result = await client.waitForOperation(op.name);
    if (!result.done || result.error) {
      throw new Error(`Ingestion failed for ${displayName}: ${JSON.stringify(result)}`);
    }
    console.log('   Ingestion complete.');
  }

  const questions = questionsFromCli.length > 0 ? questionsFromCli : defaultQuestions(files);

  console.log('\n=== Running queries ===\n');
  for (const question of questions) {
    console.log(`→ Question: ${question}`);
    const response = await client.generateGroundedAnswer({ storeName, question });
    const candidate = response?.candidates?.[0];
    if (!candidate) {
      console.log('   (No answer returned)');
      continue;
    }

    const text = extractText(candidate) || '(empty response)';
    console.log('\n----- Answer -----\n');
    console.log(text);

    const citations = extractCitations(candidate);
    if (citations.length > 0) {
      console.log('\n----- Citations -----\n');
      citations.forEach((citation, idx) => {
        console.log(`[${idx + 1}] ${citation}`);
      });
    } else {
      console.log('\n(No citations returned by the model.)');
    }

    console.log('\n====================\n');
  }

  console.log('Batch run complete.');
  console.log(`Store used: ${storeName}`);
}

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function prepareFileList(directory) {
  const entries = fs.readdirSync(directory);
  return entries
    .map((entry) => path.join(directory, entry))
    .filter((filePath) => safeStat(filePath)?.isFile())
    .sort();
}

function defaultQuestions(files) {
  const hasSpec = files.some((file) => /General Spec/i.test(file));
  const hasSchedule = files.some((file) => /Schedule of Quantities/i.test(file));
  const hasDesign = files.some((file) => /Design Plans/i.test(file));

  const questions = [
    'Summarise the overall construction staging guidance.',
    'List the key pavement quality control requirements.',
  ];

  if (hasSpec) {
    questions.push('What hold point requirements are stated for the works?');
  }
  if (hasDesign) {
    questions.push('Describe the drawing index provided in the design plans.');
  }
  if (hasSchedule) {
    questions.push('Report the scheduled quantities for asphalt wearing courses.');
  }

  return questions;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});



