import { z } from 'zod';

/**
 * WORKFLOW STEP SCHEMA
 * 
 * Individual steps within a workflow.
 * 
 * Primary Key: (projectId, workflowName, order)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface WorkflowStepNode {
  projectId: string;                         // Project ID (REQUIRED)
  workflowName: string;                      // Workflow name (REQUIRED)
  order: number;                             // Step order (REQUIRED)
  action: string;
  role: string;
  condition?: string;
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

export const WorkflowStepNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  workflowName: z.string().min(1, 'Workflow name is required'),
  order: z.number().int().positive('Order must be positive'),
  action: z.string().min(1, 'Action is required'),
  role: z.string().min(1, 'Role is required'),
  condition: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateWorkflowStepInputSchema = WorkflowStepNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateWorkflowStepInputSchema = WorkflowStepNodeSchema.partial().required({ 
  projectId: true, 
  workflowName: true,
  order: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const WORKFLOW_STEP_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT workflow_step_unique IF NOT EXISTS
  FOR (ws:WorkflowStep) REQUIRE (ws.projectId, ws.workflowName, ws.order) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX workflow_step_project_id IF NOT EXISTS
  FOR (ws:WorkflowStep) ON (ws.projectId);
  
  CREATE INDEX workflow_step_workflow IF NOT EXISTS
  FOR (ws:WorkflowStep) ON (ws.workflowName);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const WORKFLOW_STEP_QUERIES = {
  getStepsByWorkflow: `
    MATCH (w:Workflow {projectId: $projectId, name: $workflowName})-[:HAS_STEP]->(ws:WorkflowStep)
    WHERE ws.isDeleted IS NULL OR ws.isDeleted = false
    RETURN ws {
      .*,
      createdAt: toString(ws.createdAt),
      updatedAt: toString(ws.updatedAt)
    } as step
    ORDER BY ws.order
  `,
  
  createStep: `
    MATCH (w:Workflow {projectId: $projectId, name: $workflowName})
    CREATE (ws:WorkflowStep)
    SET ws = $properties
    SET ws.projectId = $projectId
    SET ws.workflowName = $workflowName
    SET ws.createdAt = datetime()
    SET ws.updatedAt = datetime()
    CREATE (w)-[:HAS_STEP]->(ws)
    RETURN ws {
      .*,
      createdAt: toString(ws.createdAt),
      updatedAt: toString(ws.updatedAt)
    } as step
  `,
  
  updateStep: `
    MATCH (ws:WorkflowStep {projectId: $projectId, workflowName: $workflowName, order: $order})
    SET ws += $properties
    SET ws.updatedAt = datetime()
    RETURN ws {
      .*,
      createdAt: toString(ws.createdAt),
      updatedAt: toString(ws.updatedAt)
    } as step
  `,
  
  deleteStep: `
    MATCH (ws:WorkflowStep {projectId: $projectId, workflowName: $workflowName, order: $order})
    SET ws.isDeleted = true
    SET ws.deletedAt = datetime()
    SET ws.deletedBy = $userId
    SET ws.updatedAt = datetime()
    RETURN ws
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const WORKFLOW_STEP_RELATIONSHIPS = {
  outgoing: [],
  incoming: [
    { 
      type: 'HAS_STEP', 
      source: 'Workflow', 
      cardinality: '1',
      description: 'Step belongs to workflow'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateWorkflowStepInput = z.infer<typeof CreateWorkflowStepInputSchema>;
export type UpdateWorkflowStepInput = z.infer<typeof UpdateWorkflowStepInputSchema>;
