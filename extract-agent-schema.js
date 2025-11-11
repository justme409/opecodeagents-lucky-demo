#!/usr/bin/env node
/**
 * Extract Agent-Specific Schema
 *
 * Extracts only the entities and schema relevant to a specific agent
 */

const fs = require('fs');
const path = require('path');

const taskName = process.argv[2];
if (!taskName) {
  console.error('Usage: node extract-agent-schema.js <task-name>');
  process.exit(1);
}

// Load manifest
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const task = manifest.tasks[taskName];
if (!task) {
  console.error(`Task '${taskName}' not found`);
  process.exit(1);
}

// Load master schema source
const schemaPath = path.join(__dirname, 'schemas/neo4j/master-schema.ts');
const schemaSource = fs.readFileSync(schemaPath, 'utf8');

function extractBlock(startIndex) {
  let depth = 0;
  let idx = startIndex;
  while (idx < schemaSource.length && schemaSource[idx] !== '{') {
    idx += 1;
  }
  if (idx >= schemaSource.length) return null;
  const blockStart = idx;
  for (; idx < schemaSource.length; idx += 1) {
    const ch = schemaSource[idx];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return schemaSource.slice(blockStart, idx + 1);
      }
    }
  }
  return null;
}

function extractInterface(entityName) {
  const search = `export interface ${entityName}Node`;
  const start = schemaSource.indexOf(search);
  if (start === -1) return null;
  const block = extractBlock(start + search.length);
  if (!block) return null;
  return block;
}

function extractMetadata(entityName) {
  const search = `export const ${entityName}Metadata`;
  const start = schemaSource.indexOf(search);
  if (start === -1) return null;
  const block = extractBlock(start + search.length);
  return block;
}

function splitTopLevelStatements(body) {
  const statements = [];
  let depth = 0;
  let tokenStart = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === ';' && depth === 0) {
      const statement = body.slice(tokenStart, i).trim();
      if (statement) statements.push(statement);
      tokenStart = i + 1;
    }
  }
  return statements;
}

function parseInlineComment(text) {
  const idx = text.indexOf('//');
  if (idx === -1) return null;
  return text.slice(idx + 2).trim();
}

function parsePropertyStatement(statement) {
  const lines = statement.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('//'));
  if (lines.length === 0) return null;

  let definition = lines.join(' ');
  const inlineComment = parseInlineComment(definition);
  let comment = null;
  if (inlineComment) {
    comment = inlineComment;
    definition = definition.slice(0, definition.indexOf('//')).trim();
  }

  const match = definition.match(/^([A-Za-z0-9_]+)(\??):\s*([\s\S]+)$/);
  if (!match) return null;
  const name = match[1];
  const optional = match[2] === '?';
  let type = match[3].trim();
  const property = { name, optional, type, comment, children: [] };

  if (type.startsWith('{')) {
    const startIdx = type.indexOf('{');
    const endIdx = type.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      const inner = type.slice(startIdx + 1, endIdx);
      property.children = parsePropertiesFromBody(inner);
      property.type = 'object';
    }
  }

  return property;
}

function parsePropertiesFromBody(body) {
  const statements = splitTopLevelStatements(body);
  const props = [];
  statements.forEach((stmt) => {
    const property = parsePropertyStatement(stmt);
    if (property) {
      props.push(property);
    }
  });
  return props;
}

function parseProperties(entityName) {
  const interfaceBlock = extractInterface(entityName);
  if (!interfaceBlock) return [];
  const body = interfaceBlock.slice(1, interfaceBlock.length - 1); // remove outer braces
  return parsePropertiesFromBody(body);
}

function parseRelationships(entityName) {
  const metadataBlock = extractMetadata(entityName);
  const relationships = { outgoing: [], incoming: [] };
  if (!metadataBlock) return relationships;

  const outgoingMatch = metadataBlock.match(/outgoing\s*:\s*\[([\s\S]*?)\]/);
  const incomingMatch = metadataBlock.match(/incoming\s*:\s*\[([\s\S]*?)\]/);

  function parseArray(match) {
    if (!match) return [];
    const arrayContent = match[1];
    const items = [];
    const objectRegex = /\{([\s\S]*?)\}/g;
    let objectMatch;
    while ((objectMatch = objectRegex.exec(arrayContent)) !== null) {
      const text = objectMatch[1];
      const typeMatch = text.match(/type\s*:\s*'([^']+)'/);
      const targetMatch = text.match(/target\s*:\s*'([^']+)'/);
      const sourceMatch = text.match(/source\s*:\s*'([^']+)'/);
      const descriptionMatch = text.match(/description\s*:\s*'([^']+)'/);
      items.push({
        type: typeMatch ? typeMatch[1] : null,
        target: targetMatch ? targetMatch[1] : null,
        source: sourceMatch ? sourceMatch[1] : null,
        description: descriptionMatch ? descriptionMatch[1] : null,
      });
    }
    return items;
  }

  relationships.outgoing = parseArray(outgoingMatch);
  relationships.incoming = parseArray(incomingMatch);
  return relationships;
}

function emitProperties(properties, indent = 0, prefix = '') {
  const lines = [];
  properties.forEach((prop) => {
    const fullName = prefix ? `${prefix}${prop.name}` : prop.name;
    const optionalText = prop.optional ? 'optional ' : '';
    const commentText = prop.comment ? ` — ${prop.comment}` : '';
    lines.push(`${' '.repeat(indent)}- \`${fullName}\` (${optionalText}${prop.type})${commentText}`);
    if (prop.children && prop.children.length > 0) {
      lines.push(emitProperties(prop.children, indent + 2, `${fullName}.`));
    }
  });
  return lines.filter(Boolean).join('\n');
}

function formatRelationships(relationships) {
  const lines = [];
  const { outgoing, incoming } = relationships;

  if ((!outgoing || outgoing.length === 0) && (!incoming || incoming.length === 0)) {
    lines.push('- None defined');
    return lines.join('\n');
  }

  if (outgoing && outgoing.length > 0) {
    lines.push('- **Outgoing**');
    outgoing.forEach((rel) => {
      const type = rel.type ? `\`${rel.type}\`` : '`type`';
      const target = rel.target ? `\`${rel.target}\`` : '`target`';
      const desc = rel.description ? ` — ${rel.description}` : '';
      lines.push(`  - ${type} → ${target}${desc}`);
    });
  }

  if (incoming && incoming.length > 0) {
    lines.push('- **Incoming**');
    incoming.forEach((rel) => {
      const type = rel.type ? `\`${rel.type}\`` : '`type`';
      const source = rel.source ? `\`${rel.source}\`` : 'source node';
      const desc = rel.description ? ` — ${rel.description}` : '';
      lines.push(`  - ${type} from ${source}${desc}`);
    });
  }

  return lines.join('\n');
}

function buildEntitySection(entityName) {
  const properties = parseProperties(entityName);
  const relationships = parseRelationships(entityName);

  const propertiesBlock = properties.length > 0
    ? emitProperties(properties)
    : '- (no properties found)';

  const relationshipsBlock = formatRelationships(relationships);

  return `## ${entityName}
**Node:** \`${entityName}\`
**Properties:**
${propertiesBlock}
**Relationships:**
${relationshipsBlock}
`;
}

const header = `# Agent Schema: ${task.agent_id}

Persist the following entities in the Generated Neo4j database exactly as described.
`;

const sections = task.entities.map(buildEntitySection).join('\n');

const output = `${header}${sections}`;

console.log(output);