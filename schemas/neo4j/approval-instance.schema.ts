import { z } from 'zod';

/**
 * APPROVAL INSTANCE SCHEMA
 * 
 * Active approval instances for items requiring approval.
 * Tracks current step and status.
 */

export interface ApprovalInstanceNode {
  id: string;
  workflowId: string;
  itemId: string;
  itemType: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  assignedTo?: string;
  dueDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const ApprovalInstanceStatusEnum = z.enum(['pending', 'in_progress', 'approved', 'rejected', 'cancelled']);

export const ApprovalInstanceNodeSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemType: z.string().min(1),
  currentStep: z.number().int().min(1),
  status: ApprovalInstanceStatusEnum,
  assignedTo: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const APPROVAL_INSTANCE_CONSTRAINTS = `
  CREATE CONSTRAINT approval_instance_id_unique IF NOT EXISTS
  FOR (ai:ApprovalInstance) REQUIRE ai.id IS UNIQUE;
  
  CREATE INDEX approval_instance_workflow IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.workflowId);
  
  CREATE INDEX approval_instance_item IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.itemId);
  
  CREATE INDEX approval_instance_status IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.status);
  
  CREATE INDEX approval_instance_assigned_to IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.assignedTo);
`;

export const APPROVAL_INSTANCE_QUERIES = {
  getAllInstances: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(ai:ApprovalInstance)
    WHERE ai.isDeleted IS NULL OR ai.isDeleted = false
    RETURN ai
    ORDER BY ai.createdAt DESC
  `,
  
  getPendingForUser: `
    MATCH (u:User {id: $userId})<-[:ASSIGNED_TO]-(ai:ApprovalInstance)
    WHERE ai.status = 'pending'
      AND (ai.isDeleted IS NULL OR ai.isDeleted = false)
    MATCH (ai)-[:FOR_ITEM]->(item)
    RETURN ai, item
    ORDER BY ai.dueDate, ai.createdAt
  `,
  
  getInstanceDetail: `
    MATCH (ai:ApprovalInstance {id: $instanceId})
    WHERE ai.isDeleted IS NULL OR ai.isDeleted = false
    MATCH (ai)-[:INSTANCE_OF]->(w:Workflow)
    MATCH (ai)-[:FOR_ITEM]->(item)
    OPTIONAL MATCH (ai)-[:HISTORY]->(actions:ApprovalAction)
    RETURN ai, w, item, collect(actions) as history
    ORDER BY actions.createdAt
  `,
  
  createInstance: `
    CREATE (ai:ApprovalInstance $properties)
    SET ai.id = randomUUID()
    SET ai.createdAt = datetime()
    SET ai.updatedAt = datetime()
    SET ai.status = coalesce(ai.status, 'pending')
    SET ai.currentStep = coalesce(ai.currentStep, 1)
    WITH ai
    MATCH (w:Workflow {id: $workflowId})
    MATCH (item {id: $itemId})
    CREATE (ai)-[:INSTANCE_OF]->(w)
    CREATE (ai)-[:FOR_ITEM]->(item)
    WITH ai
    MATCH (p:Project {id: $projectId})
    CREATE (ai)-[:BELONGS_TO_PROJECT]->(p)
    RETURN ai
  `,
  
  updateStatus: `
    MATCH (ai:ApprovalInstance {id: $instanceId})
    SET ai.status = $status
    SET ai.updatedAt = datetime()
    RETURN ai
  `,
};

export type ApprovalInstanceStatus = z.infer<typeof ApprovalInstanceStatusEnum>;

