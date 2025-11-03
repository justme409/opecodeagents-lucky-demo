import { z } from 'zod';

/**
 * APPROVAL ACTION SCHEMA
 * 
 * Individual approval actions/history entries.
 * Tracks who did what and when in the approval process.
 * 
 * Primary Key: (projectId, instanceItemType, instanceItemId, actionDate, userEmail)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ApprovalActionNode {
  projectId: string;                         // Project ID (REQUIRED)
  instanceItemType: string;                  // Instance item type (REQUIRED)
  instanceItemId: string;                    // Instance item ID (REQUIRED)
  userEmail: string;                         // User email (REQUIRED)
  action: 'submitted' | 'approved' | 'rejected' | 'commented' | 'reassigned' | 'cancelled';
  comment?: string;
  actionDate: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ApprovalActionTypeEnum = z.enum(['submitted', 'approved', 'rejected', 'commented', 'reassigned', 'cancelled']);

export const ApprovalActionNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  instanceItemType: z.string().min(1, 'Instance item type is required'),
  instanceItemId: z.string().min(1, 'Instance item ID is required'),
  userEmail: z.string().email('Valid user email is required'),
  action: ApprovalActionTypeEnum,
  comment: z.string().optional(),
  actionDate: z.coerce.date(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateApprovalActionInputSchema = ApprovalActionNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  actionDate: true,
  comment: true,
  metadata: true,
});

export const UpdateApprovalActionInputSchema = ApprovalActionNodeSchema.partial().required({ 
  projectId: true, 
  instanceItemType: true,
  instanceItemId: true,
  userEmail: true,
  actionDate: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const APPROVAL_ACTION_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT approval_action_unique IF NOT EXISTS
  FOR (aa:ApprovalAction) REQUIRE (aa.projectId, aa.instanceItemType, aa.instanceItemId, aa.actionDate, aa.userEmail) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX approval_action_project_id IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.projectId);
  
  CREATE INDEX approval_action_instance IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.instanceItemType, aa.instanceItemId);
  
  CREATE INDEX approval_action_user IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.userEmail);
  
  CREATE INDEX approval_action_date IF NOT EXISTS
  FOR (aa:ApprovalAction) ON (aa.actionDate);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const APPROVAL_ACTION_QUERIES = {
  getActionsByInstance: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $itemType, itemId: $itemId})-[:HISTORY]->(aa:ApprovalAction)
    WHERE aa.isDeleted IS NULL OR aa.isDeleted = false
    RETURN aa {
      .*,
      actionDate: toString(aa.actionDate),
      createdAt: toString(aa.createdAt),
      updatedAt: toString(aa.updatedAt)
    } as action
    ORDER BY aa.actionDate DESC
  `,
  
  getActionsByUser: `
    MATCH (aa:ApprovalAction {projectId: $projectId, userEmail: $userEmail})
    WHERE aa.isDeleted IS NULL OR aa.isDeleted = false
    RETURN aa {
      .*,
      actionDate: toString(aa.actionDate),
      createdAt: toString(aa.createdAt),
      updatedAt: toString(aa.updatedAt)
    } as action
    ORDER BY aa.actionDate DESC
  `,
  
  createAction: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $instanceItemType, itemId: $instanceItemId})
    CREATE (aa:ApprovalAction)
    SET aa = $properties
    SET aa.projectId = $projectId
    SET aa.actionDate = coalesce(aa.actionDate, datetime())
    SET aa.createdAt = datetime()
    SET aa.updatedAt = datetime()
    CREATE (ai)-[:HISTORY]->(aa)
    WITH aa
    MATCH (u:User {email: aa.userEmail})
    CREATE (aa)-[:BY_USER]->(u)
    RETURN aa {
      .*,
      actionDate: toString(aa.actionDate),
      createdAt: toString(aa.createdAt),
      updatedAt: toString(aa.updatedAt)
    } as action
  `,
  
  updateAction: `
    MATCH (aa:ApprovalAction {projectId: $projectId, instanceItemType: $instanceItemType, instanceItemId: $instanceItemId, userEmail: $userEmail, actionDate: $actionDate})
    SET aa += $properties
    SET aa.updatedAt = datetime()
    RETURN aa {
      .*,
      actionDate: toString(aa.actionDate),
      createdAt: toString(aa.createdAt),
      updatedAt: toString(aa.updatedAt)
    } as action
  `,
  
  deleteAction: `
    MATCH (aa:ApprovalAction {projectId: $projectId, instanceItemType: $instanceItemType, instanceItemId: $instanceItemId, userEmail: $userEmail, actionDate: $actionDate})
    SET aa.isDeleted = true
    SET aa.deletedAt = datetime()
    SET aa.deletedBy = $userId
    SET aa.updatedAt = datetime()
    RETURN aa
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const APPROVAL_ACTION_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BY_USER', 
      target: 'User', 
      cardinality: '1',
      description: 'Action performed by user'
    },
  ],
  incoming: [
    { 
      type: 'HISTORY', 
      source: 'ApprovalInstance', 
      cardinality: '1',
      description: 'Action belongs to approval instance'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ApprovalActionType = z.infer<typeof ApprovalActionTypeEnum>;
export type CreateApprovalActionInput = z.infer<typeof CreateApprovalActionInputSchema>;
export type UpdateApprovalActionInput = z.infer<typeof UpdateApprovalActionInputSchema>;
