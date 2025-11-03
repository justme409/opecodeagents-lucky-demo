import { z } from 'zod';

/**
 * APPROVAL INSTANCE SCHEMA
 * 
 * Active approval instances for items requiring approval.
 * Tracks current step and status.
 * 
 * Primary Key: (projectId, itemType, itemId)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ApprovalInstanceNode {
  projectId: string;                         // Project ID (REQUIRED)
  itemType: string;                          // Item type (REQUIRED, e.g., "ITP_Template", "NCR")
  itemId: string;                            // Item identifier (REQUIRED, business key of the item)
  workflowName: string;                      // Workflow name
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  assignedTo?: string;                       // User email
  dueDate?: Date;
  notes?: string;
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

export const ApprovalInstanceStatusEnum = z.enum(['pending', 'in_progress', 'approved', 'rejected', 'cancelled']);

export const ApprovalInstanceNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  itemType: z.string().min(1, 'Item type is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  workflowName: z.string().min(1, 'Workflow name is required'),
  currentStep: z.number().int().min(1),
  status: ApprovalInstanceStatusEnum,
  assignedTo: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateApprovalInstanceInputSchema = ApprovalInstanceNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  currentStep: true,
  status: true,
  assignedTo: true,
  dueDate: true,
  notes: true,
  metadata: true,
});

export const UpdateApprovalInstanceInputSchema = ApprovalInstanceNodeSchema.partial().required({ 
  projectId: true, 
  itemType: true,
  itemId: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const APPROVAL_INSTANCE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT approval_instance_unique IF NOT EXISTS
  FOR (ai:ApprovalInstance) REQUIRE (ai.projectId, ai.itemType, ai.itemId) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX approval_instance_project_id IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.projectId);
  
  CREATE INDEX approval_instance_workflow IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.workflowName);
  
  CREATE INDEX approval_instance_status IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.status);
  
  CREATE INDEX approval_instance_assigned_to IF NOT EXISTS
  FOR (ai:ApprovalInstance) ON (ai.assignedTo);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const APPROVAL_INSTANCE_QUERIES = {
  getAllInstances: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(ai:ApprovalInstance)
    WHERE ai.isDeleted IS NULL OR ai.isDeleted = false
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance
    ORDER BY ai.createdAt DESC
  `,
  
  getPendingForUser: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, assignedTo: $userEmail})
    WHERE ai.status IN ['pending', 'in_progress']
      AND (ai.isDeleted IS NULL OR ai.isDeleted = false)
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance
    ORDER BY ai.dueDate, ai.createdAt
  `,
  
  getInstanceDetail: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $itemType, itemId: $itemId})
    WHERE ai.isDeleted IS NULL OR ai.isDeleted = false
    MATCH (ai)-[:INSTANCE_OF]->(w:Workflow)
    OPTIONAL MATCH (ai)-[:HISTORY]->(actions:ApprovalAction)
    WHERE actions.isDeleted IS NULL OR actions.isDeleted = false
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance, 
           w {
      .*,
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as workflow, 
           collect(actions ORDER BY actions.createdAt) as history
  `,
  
  createInstance: `
    MATCH (p:Project {projectId: $projectId})
    MATCH (w:Workflow {projectId: $projectId, name: $workflowName})
    CREATE (ai:ApprovalInstance)
    SET ai = $properties
    SET ai.projectId = $projectId
    SET ai.createdAt = datetime()
    SET ai.updatedAt = datetime()
    SET ai.status = coalesce(ai.status, 'pending')
    SET ai.currentStep = coalesce(ai.currentStep, 1)
    CREATE (ai)-[:BELONGS_TO_PROJECT]->(p)
    CREATE (ai)-[:INSTANCE_OF]->(w)
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance
  `,
  
  updateInstance: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $itemType, itemId: $itemId})
    SET ai += $properties
    SET ai.updatedAt = datetime()
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance
  `,
  
  updateStatus: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $itemType, itemId: $itemId})
    SET ai.status = $status
    SET ai.updatedAt = datetime()
    RETURN ai {
      .*,
      dueDate: toString(ai.dueDate),
      createdAt: toString(ai.createdAt),
      updatedAt: toString(ai.updatedAt)
    } as instance
  `,
  
  deleteInstance: `
    MATCH (ai:ApprovalInstance {projectId: $projectId, itemType: $itemType, itemId: $itemId})
    SET ai.isDeleted = true
    SET ai.deletedAt = datetime()
    SET ai.deletedBy = $userId
    SET ai.updatedAt = datetime()
    RETURN ai
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const APPROVAL_INSTANCE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every approval instance belongs to exactly one project'
    },
    { 
      type: 'INSTANCE_OF', 
      target: 'Workflow', 
      cardinality: '1',
      description: 'Instance follows a workflow'
    },
    { 
      type: 'FOR_ITEM', 
      target: 'Any', 
      cardinality: '1',
      description: 'Instance is for a specific item (polymorphic)'
    },
    { 
      type: 'ASSIGNED_TO', 
      target: 'User', 
      cardinality: '0..1',
      description: 'Instance assigned to user'
    },
    { 
      type: 'HISTORY', 
      target: 'ApprovalAction', 
      cardinality: '0..*',
      description: 'Instance has approval history'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ApprovalInstanceStatus = z.infer<typeof ApprovalInstanceStatusEnum>;
export type CreateApprovalInstanceInput = z.infer<typeof CreateApprovalInstanceInputSchema>;
export type UpdateApprovalInstanceInput = z.infer<typeof UpdateApprovalInstanceInputSchema>;
