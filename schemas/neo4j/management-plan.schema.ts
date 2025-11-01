import { z } from 'zod';

/**
 * MANAGEMENT PLAN SCHEMA
 * 
 * Project management plans (Quality, Environmental, Safety, etc.).
 * Agent generates from templates and populates with project details.
 */

export interface ManagementPlanNode {
  id: string;
  
  // Plan Information
  type: 'quality' | 'environmental' | 'safety' | 'traffic' | 'communication' | 'other';
  title: string;                // e.g., "Project Quality Plan"
  docNo?: string;               // Document number
  version: string;              // Version/revision number
  revisionDate?: Date;          // Date of this revision
  
  // Jurisdiction and Standards
  jurisdiction?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  applicableStandards?: string[];  // Referenced standards (e.g., ["ISO 9001", "AS/NZS 4801"])
  
  // Content
  content?: string;             // Plain text content (deprecated, use html)
  html?: string;                // Structured HTML content (preferred)
  summary?: string;             // Executive summary
  scope?: string;               // Scope of the plan
  
  // QSE System References
  qseSystemRefs?: string[];     // References to QSE system elements
  
  // Source Tracking
  sourceDocuments?: string[];   // Document IDs used to generate this plan
  
  // Approval
  approvalStatus: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvedBy?: string;
  approvedDate?: Date;
  submittedDate?: Date;         // Date submitted for approval
  
  // Additional
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export const ManagementPlanTypeEnum = z.enum(['quality', 'environmental', 'safety', 'traffic', 'communication', 'other']);
export const ManagementPlanApprovalStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded']);
export const JurisdictionEnum = z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);

export const ManagementPlanNodeSchema = z.object({
  id: z.string().uuid(),
  
  // Plan Information
  type: ManagementPlanTypeEnum,
  title: z.string().min(1, 'Title is required'),
  docNo: z.string().optional(),
  version: z.string().min(1, 'Version is required'),
  revisionDate: z.coerce.date().optional(),
  
  // Jurisdiction and Standards
  jurisdiction: JurisdictionEnum.optional(),
  applicableStandards: z.array(z.string()).optional(),
  
  // Content
  content: z.string().optional(),
  html: z.string().optional(),
  summary: z.string().optional(),
  scope: z.string().optional(),
  
  // QSE System References
  qseSystemRefs: z.array(z.string()).optional(),
  
  // Source Tracking
  sourceDocuments: z.array(z.string()).optional(),
  
  // Approval
  approvalStatus: ManagementPlanApprovalStatusEnum,
  approvedBy: z.string().uuid().optional(),
  approvedDate: z.coerce.date().optional(),
  submittedDate: z.coerce.date().optional(),
  
  // Additional
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const MANAGEMENT_PLAN_CONSTRAINTS = `
  CREATE CONSTRAINT management_plan_id_unique IF NOT EXISTS
  FOR (mp:ManagementPlan) REQUIRE mp.id IS UNIQUE;
  
  CREATE INDEX management_plan_type IF NOT EXISTS
  FOR (mp:ManagementPlan) ON (mp.type);
  
  CREATE INDEX management_plan_approval_status IF NOT EXISTS
  FOR (mp:ManagementPlan) ON (mp.approvalStatus);
`;

export const MANAGEMENT_PLAN_QUERIES = {
  getAllPlans: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    WHERE mp.isDeleted IS NULL OR mp.isDeleted = false
    RETURN mp
    ORDER BY mp.type, mp.version DESC
  `,
  
  getPlanDetail: `
    MATCH (mp:ManagementPlan {id: $planId})
    WHERE mp.isDeleted IS NULL OR mp.isDeleted = false
    RETURN mp
  `,
  
  getApprovedPlans: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    WHERE mp.approvalStatus = 'approved'
      AND (mp.isDeleted IS NULL OR mp.isDeleted = false)
    RETURN mp
    ORDER BY mp.type
  `,
  
  createPlan: `
    CREATE (mp:ManagementPlan $properties)
    SET mp.id = randomUUID()
    SET mp.createdAt = datetime()
    SET mp.updatedAt = datetime()
    SET mp.approvalStatus = coalesce(mp.approvalStatus, 'draft')
    WITH mp
    MATCH (p:Project {id: $projectId})
    CREATE (mp)-[:BELONGS_TO_PROJECT]->(p)
    RETURN mp
  `,
  
  approvePlan: `
    MATCH (mp:ManagementPlan {id: $planId})
    SET mp.approvalStatus = 'approved'
    SET mp.approvedBy = $userId
    SET mp.approvedDate = datetime()
    SET mp.updatedAt = datetime()
    RETURN mp
  `,
};

export type ManagementPlanType = z.infer<typeof ManagementPlanTypeEnum>;
export type ManagementPlanApprovalStatus = z.infer<typeof ManagementPlanApprovalStatusEnum>;

