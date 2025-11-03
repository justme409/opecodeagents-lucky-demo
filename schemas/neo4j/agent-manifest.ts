/**
 * AGENT MANIFEST
 * 
 * This manifest defines all agents in the system and their relationship to the master schema.
 * Each agent entry includes:
 * - Agent ID and name
 * - Prompt file path
 * - Entities the agent can generate (with schemas)
 * - Input requirements
 * - Output format
 * 
 * Usage:
 * ```typescript
 * import { getAgentManifest, getAgentSchema } from '@/schemas/neo4j/agent-manifest';
 * 
 * const agent = getAgentManifest('ITP_AGENT');
 * const schema = getAgentSchema('ITP_AGENT');
 * ```
 */

import { z } from 'zod';
import {
  EntityType,
  getEntityMetadata,
  getEntitySchema,
  MasterProjectOutput,
  ALL_ENTITIES,
} from './master-schema';

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  promptPath: string;
  entities: EntityType[];
  inputRequirements: {
    required: string[];
    optional?: string[];
  };
  outputFormat: 'json' | 'markdown' | 'mixed';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export const AGENT_MANIFEST: Record<string, AgentDefinition> = {
  // -------------------------------------------------------------------------
  // PROJECT SETUP AGENT
  // -------------------------------------------------------------------------
  PROJECT_DETAILS: {
    id: 'project-details',
    name: 'Project Details Agent',
    description: 'Extracts core project information and metadata',
    promptPath: '@prompts/project-details.md',
    entities: ['Project', 'WorkType', 'AreaCode'],
    inputRequirements: {
      required: ['contract_documents', 'project_name'],
      optional: ['existing_project_data'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },

  // -------------------------------------------------------------------------
  // DOCUMENT MANAGEMENT AGENTS
  // -------------------------------------------------------------------------
  DOCUMENT_METADATA: {
    id: 'document-metadata',
    name: 'Document Metadata Extraction Agent',
    description: 'Extracts metadata from uploaded documents',
    promptPath: '@prompts/document-metadata.md',
    entities: ['Document'],
    inputRequirements: {
      required: ['document_file', 'projectId'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },

  // -------------------------------------------------------------------------
  // QUALITY MANAGEMENT AGENTS
  // -------------------------------------------------------------------------
  ITP_AGENT: {
    id: 'itp-generation',
    name: 'ITP Generation Agent',
    description: 'Generates Inspection and Test Plans from specifications',
    promptPath: '@prompts/itp-generation.md',
    entities: ['ITPTemplate', 'InspectionPoint', 'Standard'],
    inputRequirements: {
      required: ['specifications', 'projectId', 'workType'],
      optional: ['existing_standards', 'client_requirements'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4000,
  },

  STANDARDS_EXTRACTION: {
    id: 'standards-extraction',
    name: 'Standards Extraction Agent',
    description: 'Identifies and extracts referenced standards from documents',
    promptPath: '@prompts/standards-extraction.md',
    entities: ['Standard'],
    inputRequirements: {
      required: ['documents', 'projectId'],
    },
    outputFormat: 'json',
    model: 'gpt-4o-mini',
    temperature: 0.1,
  },

  // -------------------------------------------------------------------------
  // PROJECT STRUCTURE AGENTS
  // -------------------------------------------------------------------------
  WBS_EXTRACTION: {
    id: 'wbs-extraction',
    name: 'WBS Extraction Agent',
    description: 'Extracts Work Breakdown Structure from project documents',
    promptPath: '@prompts/wbs-extraction.md',
    entities: ['WBSNode'],
    inputRequirements: {
      required: ['contract_documents', 'projectId'],
      optional: ['existing_wbs'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },

  LBS_EXTRACTION: {
    id: 'lbs-extraction',
    name: 'LBS Extraction Agent',
    description: 'Extracts Location Breakdown Structure from drawings and specifications',
    promptPath: '@prompts/lbs-extraction.md',
    entities: ['LBSNode'],
    inputRequirements: {
      required: ['drawings', 'specifications', 'projectId'],
      optional: ['existing_lbs'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },

  // -------------------------------------------------------------------------
  // MANAGEMENT PLAN AGENTS
  // -------------------------------------------------------------------------
  PQP_GENERATION: {
    id: 'pqp-generation',
    name: 'PQP Generation Agent',
    description: 'Generates Project Quality Plan',
    promptPath: '@prompts/pqp-generation.md',
    entities: ['ManagementPlan'],
    inputRequirements: {
      required: ['projectId', 'specifications', 'contract_requirements'],
      optional: ['existing_itps', 'existing_standards'],
    },
    outputFormat: 'markdown',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8000,
  },

  OHSMP_GENERATION: {
    id: 'ohsmp-generation',
    name: 'OHSMP Generation Agent',
    description: 'Generates Occupational Health & Safety Management Plan',
    promptPath: '@prompts/ohsmp-generation.md',
    entities: ['ManagementPlan'],
    inputRequirements: {
      required: ['projectId', 'project_scope', 'hazard_register'],
      optional: ['site_conditions', 'regulatory_requirements'],
    },
    outputFormat: 'markdown',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8000,
  },

  EMP_GENERATION: {
    id: 'emp-generation',
    name: 'EMP Generation Agent',
    description: 'Generates Environmental Management Plan',
    promptPath: '@prompts/emp-generation.md',
    entities: ['ManagementPlan'],
    inputRequirements: {
      required: ['projectId', 'project_scope', 'environmental_aspects'],
      optional: ['site_conditions', 'regulatory_requirements'],
    },
    outputFormat: 'markdown',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8000,
  },

  QSE_GENERATION: {
    id: 'qse-generation',
    name: 'QSE Document Generation Agent',
    description: 'Generates Quality, Safety, and Environmental documents',
    promptPath: '@prompts/qse-generation.md',
    entities: ['ManagementPlan', 'Document'],
    inputRequirements: {
      required: ['projectId', 'document_type', 'template'],
      optional: ['existing_content', 'client_requirements'],
    },
    outputFormat: 'mixed',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 8000,
  },

  // -------------------------------------------------------------------------
  // MATERIAL & TESTING AGENTS
  // -------------------------------------------------------------------------
  MATERIAL_AGENT: {
    id: 'material-extraction',
    name: 'Material Extraction Agent',
    description: 'Extracts materials and mix designs from specifications',
    promptPath: '@prompts/material-extraction.md',
    entities: ['Material', 'MixDesign', 'Supplier'],
    inputRequirements: {
      required: ['specifications', 'projectId'],
      optional: ['existing_materials'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },

  TEST_METHOD_AGENT: {
    id: 'test-method-extraction',
    name: 'Test Method Extraction Agent',
    description: 'Extracts test methods from specifications and standards',
    promptPath: '@prompts/test-method-extraction.md',
    entities: ['TestMethod', 'Laboratory'],
    inputRequirements: {
      required: ['specifications', 'standards', 'projectId'],
    },
    outputFormat: 'json',
    model: 'gpt-4o-mini',
    temperature: 0.1,
  },

  // -------------------------------------------------------------------------
  // SCHEDULE & COMMERCIAL AGENTS
  // -------------------------------------------------------------------------
  SCHEDULE_EXTRACTION: {
    id: 'schedule-extraction',
    name: 'Schedule Extraction Agent',
    description: 'Extracts schedule items from Bill of Quantities',
    promptPath: '@prompts/schedule-extraction.md',
    entities: ['ScheduleItem'],
    inputRequirements: {
      required: ['boq_document', 'projectId'],
      optional: ['work_types'],
    },
    outputFormat: 'json',
    model: 'gpt-4o',
    temperature: 0.1,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get agent definition by ID
 */
export function getAgentManifest(agentId: string): AgentDefinition | undefined {
  return AGENT_MANIFEST[agentId];
}

/**
 * Get all agents that can generate a specific entity type
 */
export function getAgentsForEntity(entityType: EntityType): AgentDefinition[] {
  return Object.values(AGENT_MANIFEST).filter(agent =>
    agent.entities.includes(entityType)
  );
}

/**
 * Get all entities that an agent can generate
 */
export function getEntitiesForAgent(agentId: string): EntityType[] {
  const agent = AGENT_MANIFEST[agentId];
  return agent ? agent.entities : [];
}

/**
 * Get the Zod schema for an agent's output
 * This combines all entity schemas that the agent can generate
 */
export function getAgentSchema(agentId: string): z.ZodSchema {
  const agent = AGENT_MANIFEST[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found in manifest`);
  }

  // Build a schema object with all entities the agent can generate
  const schemaObject: Record<string, z.ZodSchema> = {};
  
  for (const entityType of agent.entities) {
    const entitySchema = getEntitySchema(entityType);
    // Make arrays for entities that can have multiple instances
    if (shouldBeArray(entityType)) {
      schemaObject[entityType] = z.array(entitySchema).optional();
    } else {
      schemaObject[entityType] = entitySchema.optional();
    }
  }

  return z.object(schemaObject);
}

/**
 * Helper to determine if an entity should be an array in agent output
 */
function shouldBeArray(entityType: EntityType): boolean {
  // Single instance entities
  const singleInstanceEntities: EntityType[] = ['Project'];
  
  return !singleInstanceEntities.includes(entityType);
}

/**
 * Get the full output specification for an agent
 * Includes entity schemas, relationships, and metadata
 */
export function getAgentOutputSpec(agentId: string): {
  schema: z.ZodSchema;
  entities: Array<{
    type: EntityType;
    schema: z.ZodSchema;
    metadata: ReturnType<typeof getEntityMetadata>;
  }>;
  relationships: Array<{
    from: EntityType;
    to: EntityType;
    type: string;
  }>;
} {
  const agent = AGENT_MANIFEST[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found in manifest`);
  }

  const entities = agent.entities.map(entityType => ({
    type: entityType,
    schema: getEntitySchema(entityType),
    metadata: getEntityMetadata(entityType),
  }));

  // Extract all possible relationships between the entities this agent generates
  const relationships: Array<{
    from: EntityType;
    to: EntityType;
    type: string;
  }> = [];

  for (const entity of entities) {
    const outgoing = entity.metadata.relationships?.outgoing || [];
    for (const rel of outgoing) {
      if (agent.entities.includes(rel.target as EntityType)) {
        relationships.push({
          from: entity.type,
          to: rel.target as EntityType,
          type: rel.type,
        });
      }
    }
  }

  return {
    schema: getAgentSchema(agentId),
    entities,
    relationships,
  };
}

/**
 * Get a formatted prompt instruction for an agent
 * This can be injected into the agent's system prompt
 */
export function getAgentSchemaInstruction(agentId: string): string {
  const spec = getAgentOutputSpec(agentId);
  
  let instruction = `# Output Schema\n\n`;
  instruction += `You must generate output in the following JSON format:\n\n`;
  instruction += `\`\`\`json\n`;
  instruction += `{\n`;
  
  for (const entity of spec.entities) {
    const isArray = shouldBeArray(entity.type);
    const outgoingCount = entity.metadata.relationships?.outgoing?.length || 0;
    instruction += `  "${entity.type}": ${isArray ? '[' : '{'}\n`;
    instruction += `    // Schema: ${entity.type}\n`;
    instruction += `    // ${outgoingCount} outgoing relationships\n`;
    instruction += `  ${isArray ? ']' : '}'},\n`;
  }
  
  instruction += `}\n`;
  instruction += `\`\`\`\n\n`;
  
  instruction += `## Entity Relationships\n\n`;
  for (const rel of spec.relationships) {
    instruction += `- ${rel.from} --[${rel.type}]--> ${rel.to}\n`;
  }
  
  instruction += `\n## Important Notes\n\n`;
  instruction += `- All entities must include a \`projectId\` field\n`;
  instruction += `- Use business keys (e.g., \`code\`, \`number\`, \`docNo\`) as primary identifiers\n`;
  instruction += `- Do NOT generate UUIDs - the system will handle identity\n`;
  instruction += `- Relationships will be created automatically based on your output\n`;
  
  return instruction;
}

/**
 * List all available agents
 */
export function listAgents(): Array<{
  id: string;
  name: string;
  description: string;
  entities: EntityType[];
}> {
  return Object.values(AGENT_MANIFEST).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    entities: agent.entities,
  }));
}

/**
 * Get agent configuration for LangGraph or orchestrator
 */
export function getAgentConfig(agentId: string): {
  id: string;
  name: string;
  promptPath: string;
  schema: z.ZodSchema;
  model: string;
  temperature: number;
  maxTokens?: number;
} {
  const agent = AGENT_MANIFEST[agentId];
  if (!agent) {
    throw new Error(`Agent ${agentId} not found in manifest`);
  }

  return {
    id: agent.id,
    name: agent.name,
    promptPath: agent.promptPath,
    schema: getAgentSchema(agentId),
    model: agent.model || 'gpt-4o',
    temperature: agent.temperature || 0.2,
    maxTokens: agent.maxTokens,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AGENT_MANIFEST;

