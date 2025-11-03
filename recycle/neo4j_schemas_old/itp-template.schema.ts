import { z } from 'zod';

/**
 * ITP TEMPLATE SCHEMA
 * 
 * Inspection and Test Plan templates extracted from specification documents.
 * Templates define the inspection points, hold points, and test requirements
 * for a specific type of work.
 * 
 * Primary Key: (projectId, docNo)
 * Agent generates ITP templates by:
 * - Extracting ITP structures from specifications
 * - Parsing inspection points and requirements
 * - Identifying hold/witness points
 * - Extracting test requirements and acceptance criteria
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface ITPTemplateNode {
  projectId: string;                         // Project ID (REQUIRED)
  docNo: string;                             // Document number (REQUIRED, e.g., "ITP-SG-001")
  description: string;
  workType: string;
  specRef: string;
  
  // Jurisdiction and Standards
  jurisdiction?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  applicableStandards?: string[];            // e.g., ["AS 3600", "AS 1379"]
  
  // Scope
  scopeOfWork?: string;                      // Description of work covered by this ITP
  
  // Version Control
  revisionDate: Date;
  revisionNumber: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  
  // Approval
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;                       // User email
  approvedDate?: Date;
  
  // Additional
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

export interface ITPTemplateRelationships {
  belongsToProject: string;
  hasPoints?: string[];          // Inspection Point IDs
  supersedes?: string;           // Previous template docNo
  approvedBy?: string[];         // User emails
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const ITPTemplateStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded']);
export const ApprovalStatusEnum = z.enum(['not_required', 'pending', 'approved', 'rejected']);
export const JurisdictionEnum = z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);

export const ITPTemplateNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  docNo: z.string().min(1, 'Document number is required'),
  description: z.string().min(1, 'Description is required'),
  workType: z.string().min(1, 'Work type is required'),
  specRef: z.string().min(1, 'Specification reference is required'),
  
  // Jurisdiction and Standards
  jurisdiction: JurisdictionEnum.optional(),
  applicableStandards: z.array(z.string()).optional(),
  
  // Scope
  scopeOfWork: z.string().optional(),
  
  // Version Control
  revisionDate: z.coerce.date(),
  revisionNumber: z.string().default('A'),
  status: ITPTemplateStatusEnum,
  
  // Approval
  approvalStatus: ApprovalStatusEnum,
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  
  // Additional
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

export const CreateITPTemplateInputSchema = ITPTemplateNodeSchema.omit({
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
  revisionNumber: true,
  approvedBy: true,
  approvedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateITPTemplateInputSchema = ITPTemplateNodeSchema.partial().required({ 
  projectId: true, 
  docNo: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const ITP_TEMPLATE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT itp_template_unique IF NOT EXISTS
  FOR (t:ITP_Template) REQUIRE (t.projectId, t.docNo) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX itp_template_project_id IF NOT EXISTS
  FOR (t:ITP_Template) ON (t.projectId);
  
  CREATE INDEX itp_template_work_type IF NOT EXISTS
  FOR (t:ITP_Template) ON (t.workType);
  
  CREATE INDEX itp_template_status IF NOT EXISTS
  FOR (t:ITP_Template) ON (t.status);
  
  CREATE INDEX itp_template_approval_status IF NOT EXISTS
  FOR (t:ITP_Template) ON (t.approvalStatus);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentITPTemplateOutput {
  templates: Array<{
    docNo: string;
    description: string;
    workType: string;
    specRef: string;
    jurisdiction?: string;
    applicableStandards?: string[];
    scopeOfWork?: string;
    revisionDate: string;
    revisionNumber?: string;
    inspectionPoints: Array<{
      sequence: number;
      section?: 'preliminaries' | 'materials' | 'pre_construction' | 'construction' | 'geometrics' | 'conformance';
      description: string;
      type: 'hold' | 'witness' | 'surveillance' | 'record';
      requirement: string;
      acceptanceCriteria?: string;
      testMethod?: string;
      testFrequency?: string;
      standardsRef?: string[];
      isHoldPoint: boolean;
      isWitnessPoint: boolean;
      responsibleParty?: string;
    }>;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const ITP_TEMPLATE_QUERIES = {
  // Get all ITP templates for a project
  getAllTemplates: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
    ORDER BY t.docNo
  `,
  
  // Get template with inspection points
  getTemplateDetail: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $docNo})
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    OPTIONAL MATCH (t)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template, 
           collect(ip ORDER BY ip.sequence) as inspectionPoints
  `,
  
  // Get templates by work type
  getTemplatesByWorkType: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.workType = $workType
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
    ORDER BY t.docNo
  `,
  
  // Get approved templates
  getApprovedTemplates: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.status = 'approved'
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
    ORDER BY t.workType, t.docNo
  `,
  
  // Get templates pending approval
  getTemplatesPendingApproval: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.approvalStatus = 'pending'
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
    ORDER BY t.revisionDate DESC
  `,
  
  // Create ITP template
  createTemplate: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (t:ITP_Template)
    SET t = $properties
    SET t.projectId = $projectId
    SET t.createdAt = datetime()
    SET t.updatedAt = datetime()
    SET t.status = coalesce(t.status, 'draft')
    SET t.approvalStatus = coalesce(t.approvalStatus, 'not_required')
    SET t.revisionNumber = coalesce(t.revisionNumber, 'A')
    CREATE (t)-[:BELONGS_TO_PROJECT]->(p)
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
  `,
  
  // Update ITP template
  updateTemplate: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $docNo})
    SET t += $properties
    SET t.updatedAt = datetime()
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
  `,
  
  // Approve ITP template
  approveTemplate: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $docNo})
    SET t.approvalStatus = 'approved'
    SET t.status = 'approved'
    SET t.approvedDate = datetime()
    SET t.approvedBy = $userEmail
    SET t.updatedAt = datetime()
    RETURN t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
  `,
  
  // Create new revision (supersede old template)
  createRevision: `
    MATCH (old:ITP_Template {projectId: $projectId, docNo: $oldDocNo})
    CREATE (new:ITP_Template)
    SET new = old
    SET new.docNo = $newDocNo
    SET new.revisionNumber = $newRevisionNumber
    SET new.revisionDate = datetime()
    SET new.status = 'draft'
    SET new.approvalStatus = 'not_required'
    SET new.createdAt = datetime()
    SET new.updatedAt = datetime()
    SET old.status = 'superseded'
    CREATE (new)-[:SUPERSEDES]->(old)
    WITH new, old
    MATCH (old)-[:BELONGS_TO_PROJECT]->(p:Project)
    CREATE (new)-[:BELONGS_TO_PROJECT]->(p)
    RETURN new {
      .*,
      revisionDate: toString(new.revisionDate),
      approvedDate: toString(new.approvedDate),
      createdAt: toString(new.createdAt),
      updatedAt: toString(new.updatedAt)
    } as template
  `,
  
  // Soft delete template
  deleteTemplate: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $docNo})
    SET t.isDeleted = true
    SET t.deletedAt = datetime()
    SET t.deletedBy = $userId
    SET t.updatedAt = datetime()
    RETURN t
  `,
  
  // Get template statistics
  getTemplateStatistics: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    RETURN 
      count(t) as totalTemplates,
      count(CASE WHEN t.status = 'draft' THEN 1 END) as draftTemplates,
      count(CASE WHEN t.status = 'in_review' THEN 1 END) as inReviewTemplates,
      count(CASE WHEN t.status = 'approved' THEN 1 END) as approvedTemplates,
      count(CASE WHEN t.approvalStatus = 'pending' THEN 1 END) as pendingApproval
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const ITP_TEMPLATE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every template belongs to exactly one project'
    },
    { 
      type: 'HAS_POINT', 
      target: 'InspectionPoint', 
      cardinality: '0..*',
      description: 'Template has multiple inspection points'
    },
    { 
      type: 'SUPERSEDES', 
      target: 'ITP_Template', 
      cardinality: '0..1',
      description: 'New revision supersedes old template'
    },
    { 
      type: 'APPROVED_BY', 
      target: 'User', 
      cardinality: '0..*',
      description: 'Template approved by users'
    },
  ],
  incoming: [
    { 
      type: 'INSTANCE_OF', 
      source: 'ITP_Instance', 
      cardinality: '0..*',
      description: 'ITP instances created from this template'
    },
    { 
      type: 'SUPERSEDES', 
      source: 'ITP_Template', 
      cardinality: '0..1',
      description: 'Newer revision supersedes this template'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Document', 
      cardinality: '0..*',
      description: 'Documents may be related to template'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ITPTemplateStatus = z.infer<typeof ITPTemplateStatusEnum>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;
export type CreateITPTemplateInput = z.infer<typeof CreateITPTemplateInputSchema>;
export type UpdateITPTemplateInput = z.infer<typeof UpdateITPTemplateInputSchema>;
