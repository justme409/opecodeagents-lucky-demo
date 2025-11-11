const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

function ensureRuntime() {
  if (typeof fetch === 'undefined' || typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('Global fetch/FormData/Blob are required. Use Node.js 18+ or newer runtime.');
  }
}

function createGeminiClient() {
  ensureRuntime();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Export a valid key before continuing.');
  }

  const apiBaseUrl = process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';

  async function createFileSearchStore(displayName) {
    const url = new URL('/v1beta/fileSearchStores', apiBaseUrl);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    });

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new Error(`Failed to create store (${response.status}): ${JSON.stringify(errorBody)}`);
    }

    return response.json();
  }

  async function uploadFileToStore({ storeName, filePath, displayName, chunkingConfig }) {
    const url = new URL(`/upload/v1beta/${storeName}:uploadToFileSearchStore`, apiBaseUrl);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('uploadType', 'multipart');

    const buffer = await fs.promises.readFile(filePath);
    const form = new FormData();
    const mimeType = detectMimeType(filePath);
    const blob = new Blob([buffer], { type: mimeType });

    const metadata = {
      display_name: displayName,
      mime_type: mimeType,
    };

    if (chunkingConfig) {
      metadata.chunking_config = chunkingConfig;
    }

    form.append('metadata', JSON.stringify(metadata));
    form.append('file', blob, displayName);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: form,
      });
    } catch (err) {
      throw new Error(`Upload request failed: ${err.message}`);
    }

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new Error(`Failed to upload file (${response.status}): ${JSON.stringify(errorBody)}`);
    }

    return response.json();
  }

  async function waitForOperation(operationName, options = {}) {
    const start = Date.now();
    const maxWaitMs = options.maxWaitMs ?? 10 * 60 * 1000;
    const pollIntervalMs = options.pollIntervalMs ?? 3000;

    while (Date.now() - start < maxWaitMs) {
      const operation = await getOperation(operationName);
      if (operation.done) {
        return operation;
      }
      await sleep(pollIntervalMs);
    }

    throw new Error(`Operation timeout after ${maxWaitMs / 1000}s for ${operationName}`);
  }

  async function getOperation(operationName) {
    const url = new URL(`/v1beta/${operationName}`, apiBaseUrl);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new Error(`Failed to fetch operation (${response.status}): ${JSON.stringify(errorBody)}`);
    }

    return response.json();
  }

  async function generateGroundedAnswer({ storeName, question, model = process.env.GEMINI_MODEL || 'models/gemini-2.5-flash' }) {
    const modelName = normalizeModelName(model);
    const url = new URL(`/v1beta/${modelName}:generateContent`, apiBaseUrl);
    url.searchParams.set('key', apiKey);

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: question }],
        },
      ],
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [storeName],
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await safeJson(response);
      throw new Error(`generateContent failed (${response.status}): ${JSON.stringify(errorBody)}`);
    }

    return response.json();
  }

  function buildChunkingConfigFromEnv(env = process.env) {
    const maxTokens = parseIntegerEnv(env.GEMINI_MAX_TOKENS_PER_CHUNK);
    const overlap = parseIntegerEnv(env.GEMINI_MAX_OVERLAP_TOKENS);

    if (!maxTokens && !overlap) {
      return null;
    }

    const config = { white_space_config: {} };

    if (maxTokens) {
      config.white_space_config.max_tokens_per_chunk = maxTokens;
    }

    if (overlap) {
      config.white_space_config.max_overlap_tokens = overlap;
    }

    return config;
  }

  return {
    apiKey,
    apiBaseUrl,
    createFileSearchStore,
    uploadFileToStore,
    waitForOperation,
    generateGroundedAnswer,
    buildChunkingConfigFromEnv,
  };
}

function extractText(candidate) {
  const parts = candidate?.content?.parts || candidate?.output || [];
  return parts
    .filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
}

function extractCitations(candidate) {
  const grounding = candidate?.groundingMetadata || candidate?.grounding_metadata || candidate?.groundingInfo;
  if (!grounding) return [];

  const sources = grounding.sources || grounding.groundingSources || [];
  if (!Array.isArray(sources)) return [];

  return sources
    .map((source) => {
      if (source?.file) {
        const name = source.file?.name || source.file?.displayName || 'Unnamed source';
        const chunk = source.file?.chunkText || source.file?.excerpts?.map((excerpt) => excerpt.text).join(' ') || '';
        return `${name}${chunk ? ` — ${chunk}` : ''}`;
      }
      if (source?.citationMetadata?.sourceId) {
        return `Source ${source.citationMetadata.sourceId}`;
      }
      return null;
    })
    .filter(Boolean);
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.txt':
    case '.md':
      return 'text/plain';
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.csv':
      return 'text/csv';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

function normalizeModelName(name) {
  return name.startsWith('models/') ? name : `models/${name}`;
}

function parseIntegerEnv(value) {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`Invalid integer environment value: ${value}`);
  }
  return num;
}

async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

module.exports = {
  createGeminiClient,
  extractText,
  extractCitations,
};



