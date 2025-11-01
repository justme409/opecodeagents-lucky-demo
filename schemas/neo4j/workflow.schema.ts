import { z } from 'zod';

/**
 * WORKFLOW SCHEMA
 * 
 * Approval workflow definitions.
 * Agent generates workflows from project rules and requirements.
 */

export interface WorkflowNode {
  id: string;
  name: string;
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
}

export const WorkflowTypeEnum = z.enum(['approval', 'review', 'notification', 'escalation']);

export const WorkflowStepSchema = z.object({
  order: z.number().int().positive(),
  action: z.string().min(1),
  role: z.string().min(1),
  condition: z.string().optional(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: WorkflowTypeEnum,
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  isActive: z.boolean(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const WORKFLOW_CONSTRAINTS = `
  CREATE CONSTRAINT workflow_id_unique IF NOT EXISTS
  FOR (w:Workflow) REQUIRE w.id IS UNIQUE;
  
  CREATE INDEX workflow_type IF NOT EXISTS
  FOR (w:Workflow) ON (w.type);
  
  CREATE INDEX workflow_active IF NOT EXISTS
  FOR (w:Workflow) ON (w.isActive);
`;

export const WORKFLOW_QUERIES = {
  getAllWorkflows: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(w:Workflow)
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    RETURN w
    ORDER BY w.name
  `,
  
  getActiveWorkflows: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(w:Workflow)
    WHERE w.isActive = true
      AND (w.isDeleted IS NULL OR w.isDeleted = false)
    RETURN w
    ORDER BY w.name
  `,
  
  createWorkflow: `
    CREATE (w:Workflow $properties)
    SET w.id = randomUUID()
    SET w.createdAt = datetime()
    SET w.updatedAt = datetime()
    SET w.isActive = coalesce(w.isActive, true)
    WITH w
    MATCH (p:Project {id: $projectId})
    CREATE (w)-[:BELONGS_TO_PROJECT]->(p)
    RETURN w
  `,
};

export type WorkflowType = z.infer<typeof WorkflowTypeEnum>;

