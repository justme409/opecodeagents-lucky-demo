import { z } from 'zod';

/**
 * WORKFLOW STEP SCHEMA
 * 
 * Individual steps within a workflow.
 * Defines actions, roles, and conditions.
 */

export interface WorkflowStepNode {
  id: string;
  workflowId: string;
  order: number;
  action: string;
  role: string;
  condition?: string;
  timeoutDays?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const WorkflowStepNodeSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  order: z.number().int().positive(),
  action: z.string().min(1),
  role: z.string().min(1),
  condition: z.string().optional(),
  timeoutDays: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const WORKFLOW_STEP_CONSTRAINTS = `
  CREATE CONSTRAINT workflow_step_id_unique IF NOT EXISTS
  FOR (ws:WorkflowStep) REQUIRE ws.id IS UNIQUE;
  
  CREATE INDEX workflow_step_workflow IF NOT EXISTS
  FOR (ws:WorkflowStep) ON (ws.workflowId);
  
  CREATE INDEX workflow_step_order IF NOT EXISTS
  FOR (ws:WorkflowStep) ON (ws.order);
`;

export const WORKFLOW_STEP_QUERIES = {
  getStepsByWorkflow: `
    MATCH (w:Workflow {id: $workflowId})-[:HAS_STEP]->(ws:WorkflowStep)
    WHERE ws.isDeleted IS NULL OR ws.isDeleted = false
    RETURN ws
    ORDER BY ws.order
  `,
  
  createStep: `
    CREATE (ws:WorkflowStep $properties)
    SET ws.id = randomUUID()
    SET ws.createdAt = datetime()
    SET ws.updatedAt = datetime()
    WITH ws
    MATCH (w:Workflow {id: $workflowId})
    CREATE (w)-[:HAS_STEP]->(ws)
    RETURN ws
  `,
};

