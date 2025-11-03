import { z } from 'zod';

/**
 * MANAGEMENT PLAN SCHEMA
 * 
 * Project management plans (QMP, EMP, Safety Plan, etc.).
 * Agent extracts from management plan documents.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ManagementPlanNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Plan code (REQUIRED, e.g., "QMP-001")
  type: 'quality' | 'environmental' | 'safety' | 'traffic' | 'construction' | 'other';
  title: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;                       // User email
  approvedDate?: Date;
  effectiveDate?: Date;
  reviewDate?: Date;
  fileUrl?: string;
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

export const ManagementPlanTypeEnum = z.enum(['quality', 'environmental', 'safety', 'traffic', 'construction', 'other']);
export const ManagementPlanStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded']);
export const ManagementPlanApprovalStatusEnum = z.enum(['not_required', 'pending', 'approved', 'rejected']);

export const ManagementPlanNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Plan code is required'),
  type: ManagementPlanTypeEnum,
  title: z.string().min(1, 'Title is required'),
  version: z.string().min(1, 'Version is required'),
  status: ManagementPlanStatusEnum,
  approvalStatus: ManagementPlanApprovalStatusEnum,
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  effectiveDate: z.coerce.date().optional(),
  reviewDate: z.coerce.date().optional(),
  fileUrl: z.string().optional(),
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

export const CreateManagementPlanInputSchema = ManagementPlanNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  approvalStatus: true,
  approvedBy: true,
  approvedDate: true,
  effectiveDate: true,
  reviewDate: true,
  notes: true,
  metadata: true,
});

export const UpdateManagementPlanInputSchema = ManagementPlanNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const MANAGEMENT_PLAN_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT management_plan_unique IF NOT EXISTS
  FOR (mp:ManagementPlan) REQUIRE (mp.projectId, mp.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX management_plan_project_id IF NOT EXISTS
  FOR (mp:ManagementPlan) ON (mp.projectId);
  
  CREATE INDEX management_plan_type IF NOT EXISTS
  FOR (mp:ManagementPlan) ON (mp.type);
  
  CREATE INDEX management_plan_status IF NOT EXISTS
  FOR (mp:ManagementPlan) ON (mp.status);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const MANAGEMENT_PLAN_QUERIES = {
  getAllPlans: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    WHERE mp.isDeleted IS NULL OR mp.isDeleted = false
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
    ORDER BY mp.type, mp.code
  `,
  
  getPlanByCode: `
    MATCH (mp:ManagementPlan {projectId: $projectId, code: $code})
    WHERE mp.isDeleted IS NULL OR mp.isDeleted = false
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
  `,
  
  getApprovedPlans: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    WHERE mp.status = 'approved'
      AND (mp.isDeleted IS NULL OR mp.isDeleted = false)
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
    ORDER BY mp.type, mp.code
  `,
  
  createPlan: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (mp:ManagementPlan)
    SET mp = $properties
    SET mp.projectId = $projectId
    SET mp.createdAt = datetime()
    SET mp.updatedAt = datetime()
    SET mp.status = coalesce(mp.status, 'draft')
    SET mp.approvalStatus = coalesce(mp.approvalStatus, 'not_required')
    CREATE (mp)-[:BELONGS_TO_PROJECT]->(p)
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
  `,
  
  updatePlan: `
    MATCH (mp:ManagementPlan {projectId: $projectId, code: $code})
    SET mp += $properties
    SET mp.updatedAt = datetime()
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
  `,
  
  approvePlan: `
    MATCH (mp:ManagementPlan {projectId: $projectId, code: $code})
    SET mp.status = 'approved'
    SET mp.approvalStatus = 'approved'
    SET mp.approvedDate = datetime()
    SET mp.approvedBy = $userEmail
    SET mp.updatedAt = datetime()
    RETURN mp {
      .*,
      approvedDate: toString(mp.approvedDate),
      effectiveDate: toString(mp.effectiveDate),
      reviewDate: toString(mp.reviewDate),
      createdAt: toString(mp.createdAt),
      updatedAt: toString(mp.updatedAt)
    } as plan
  `,
  
  deletePlan: `
    MATCH (mp:ManagementPlan {projectId: $projectId, code: $code})
    SET mp.isDeleted = true
    SET mp.deletedAt = datetime()
    SET mp.deletedBy = $userId
    SET mp.updatedAt = datetime()
    RETURN mp
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const MANAGEMENT_PLAN_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every management plan belongs to exactly one project'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ManagementPlanType = z.infer<typeof ManagementPlanTypeEnum>;
export type ManagementPlanStatus = z.infer<typeof ManagementPlanStatusEnum>;
export type ManagementPlanApprovalStatus = z.infer<typeof ManagementPlanApprovalStatusEnum>;
export type CreateManagementPlanInput = z.infer<typeof CreateManagementPlanInputSchema>;
export type UpdateManagementPlanInput = z.infer<typeof UpdateManagementPlanInputSchema>;
