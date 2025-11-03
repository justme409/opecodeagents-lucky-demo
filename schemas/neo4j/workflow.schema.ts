import { z } from 'zod';

/**
 * WORKFLOW SCHEMA
 * 
 * Approval workflow definitions.
 * Agent generates workflows from project rules and requirements.
 * 
 * Primary Key: (projectId, name)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface WorkflowNode {
  projectId: string;                         // Project ID (REQUIRED)
  name: string;                              // Workflow name (REQUIRED, e.g., "ITP Approval")
  type: 'approval' | 'review' | 'notification' | 'escalation';
  description?: string;
  steps: Array<{
    order: number;
    action: string;
    role: string;
    condition?: string;
  }>;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const WorkflowTypeEnum = z.enum(['approval', 'review', 'notification', 'escalation']);

export const WorkflowStepSchema = z.object({
  order: z.number().int().positive(),
  action: z.string().min(1),
  role: z.string().min(1),
  condition: z.string().optional(),
});

export const WorkflowNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  type: WorkflowTypeEnum,
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  isActive: z.boolean(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateWorkflowInputSchema = WorkflowNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  isActive: true,
  metadata: true,
});

export const UpdateWorkflowInputSchema = WorkflowNodeSchema.partial().required({ 
  projectId: true, 
  name: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const WORKFLOW_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT workflow_unique IF NOT EXISTS
  FOR (w:Workflow) REQUIRE (w.projectId, w.name) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX workflow_project_id IF NOT EXISTS
  FOR (w:Workflow) ON (w.projectId);
  
  CREATE INDEX workflow_type IF NOT EXISTS
  FOR (w:Workflow) ON (w.type);
  
  CREATE INDEX workflow_active IF NOT EXISTS
  FOR (w:Workflow) ON (w.isActive);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const WORKFLOW_QUERIES = {
  getAllWorkflows: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(w:Workflow)
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    RETURN w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow
    ORDER BY w.name
  `,
  
  getActiveWorkflows: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(w:Workflow)
    WHERE w.isActive = true
      AND (w.isDeleted IS NULL OR w.isDeleted = false)
    RETURN w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow
    ORDER BY w.name
  `,
  
  getWorkflowByName: `
    MATCH (w:Workflow {projectId: $projectId, name: $name})
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    OPTIONAL MATCH (w)-[:HAS_STEP]->(ws:WorkflowStep)
    WHERE ws.isDeleted IS NULL OR ws.isDeleted = false
    RETURN w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow, collect(ws ORDER BY ws.order) as steps
  `,
  
  createWorkflow: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (w:Workflow)
    SET w = $properties
    SET w.projectId = $projectId
    SET w.createdAt = datetime()
    SET w.updatedAt = datetime()
    SET w.isActive = coalesce(w.isActive, true)
    CREATE (w)-[:BELONGS_TO_PROJECT]->(p)
    RETURN w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow
  `,
  
  updateWorkflow: `
    MATCH (w:Workflow {projectId: $projectId, name: $name})
    SET w += $properties
    SET w.updatedAt = datetime()
    RETURN w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow
  `,
  
  deleteWorkflow: `
    MATCH (w:Workflow {projectId: $projectId, name: $name})
    SET w.isDeleted = true
    SET w.deletedAt = datetime()
    SET w.deletedBy = $userId
    SET w.updatedAt = datetime()
    RETURN w
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const WORKFLOW_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every workflow belongs to exactly one project'
    },
    { 
      type: 'HAS_STEP', 
      target: 'WorkflowStep', 
      cardinality: '0..*',
      description: 'Workflow has steps'
    },
  ],
  incoming: [
    { 
      type: 'INSTANCE_OF', 
      source: 'ApprovalInstance', 
      cardinality: '0..*',
      description: 'Approval instances use this workflow'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type WorkflowType = z.infer<typeof WorkflowTypeEnum>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowInputSchema>;
