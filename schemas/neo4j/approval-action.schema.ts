import { z } from 'zod';

/**
 * APPROVAL ACTION SCHEMA
 * 
 * History of approval actions (approve, reject, comment, etc.).
 * Tracks who did what and when.
 */

export interface ApprovalActionNode {
  id: string;
  instanceId: string;
  step: number;
  action: 'approve' | 'reject' | 'comment' | 'reassign' | 'cancel';
  userId: string;
  comments?: string;
  date: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export const ApprovalActionTypeEnum = z.enum(['approve', 'reject', 'comment', 'reassign', 'cancel']);

export const ApprovalActionNodeSchema = z.object({
  id: z.string().uuid(),
  instanceId: z.string().uuid(),
  step: z.number().int().positive(),
  action: ApprovalActionTypeEnum,
  userId: z.string().uuid(),
  comments: z.string().optional(),
  date: z.coerce.date(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
});

export const APPROVAL_ACTION_CONSTRAINTS = `
  CREATE CONSTRAINT approval_action_id_unique IF NOT EXISTS
  FOR (aa:ApprovalAction) REQUIRE aa.id IS UNIQUE;
  
  CREATE INDEX approval_action_instance IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.instanceId);
  
  CREATE INDEX approval_action_user IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.userId);
  
  CREATE INDEX approval_action_date IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.date);
`;

export const APPROVAL_ACTION_QUERIES = {
  getActionsByInstance: `
    MATCH (ai:ApprovalInstance {id: $instanceId})-[:HISTORY]->(aa:ApprovalAction)
    MATCH (aa)-[:BY_USER]->(u:User)
    RETURN aa, u
    ORDER BY aa.date
  `,
  
  createAction: `
    CREATE (aa:ApprovalAction $properties)
    SET aa.id = randomUUID()
    SET aa.createdAt = datetime()
    SET aa.date = coalesce(aa.date, datetime())
    WITH aa
    MATCH (ai:ApprovalInstance {id: $instanceId})
    MATCH (u:User {id: $userId})
    CREATE (ai)-[:HISTORY]->(aa)
    CREATE (aa)-[:BY_USER]->(u)
    RETURN aa
  `,
};

export type ApprovalActionType = z.infer<typeof ApprovalActionTypeEnum>;

