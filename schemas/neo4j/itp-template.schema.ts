import { z } from 'zod';

/**
 * ITP TEMPLATE SCHEMA
 * 
 * Inspection and Test Plan templates extracted from specification documents.
 * Templates define the inspection points, hold points, and test requirements
 * for a specific type of work.
 * 
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
  id: string;
  docNo: string;
  description: string;
  workType: string;
  specRef: string;
  
  // Jurisdiction and Standards
  jurisdiction?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  applicableStandards?: string[];    // e.g., ["AS 3600", "AS 1379"]
  
  // Scope
  scopeOfWork?: string;              // Description of work covered by this ITP
  
  // Version Control
  revisionDate: Date;
  revisionNumber: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  
  // Approval
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  
  // Additional
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ITPTemplateRelationships {
  belongsToProject: string;
  hasPoints?: string[];          // Inspection Point IDs
  supersedes?: string;           // Previous template version
  approvedBy?: string[];         // User IDs
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const ITPTemplateStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded']);
export const ApprovalStatusEnum = z.enum(['not_required', 'pending', 'approved', 'rejected']);
export const JurisdictionEnum = z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);

export const ITPTemplateNodeSchema = z.object({
  id: z.string().uuid(),
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
  approvedBy: z.string().uuid().optional(),
  approvedDate: z.coerce.date().optional(),
  
  // Additional
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const CreateITPTemplateInputSchema = ITPTemplateNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
}).partial({
  status: true,
  approvalStatus: true,
  revisionNumber: true,
  approvedBy: true,
  approvedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateITPTemplateInputSchema = ITPTemplateNodeSchema.partial().required({ id: true });

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const ITP_TEMPLATE_CONSTRAINTS = `
  -- Unique constraints
  CREATE CONSTRAINT itp_template_id_unique IF NOT EXISTS
  FOR (t:ITP_Template) REQUIRE t.id IS UNIQUE;
  
  CREATE CONSTRAINT itp_template_docno_unique IF NOT EXISTS
  FOR (t:ITP_Template) REQUIRE t.docNo IS UNIQUE;
  
  -- Indexes for performance
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
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    RETURN t
    ORDER BY t.docNo
  `,
  
  // Get template with inspection points
  getTemplateDetail: `
    MATCH (t:ITP_Template {id: $templateId})
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    OPTIONAL MATCH (t)-[:HAS_POINT]->(ip:InspectionPoint)
    RETURN t, collect(ip) as inspectionPoints
    ORDER BY ip.sequence
  `,
  
  // Get templates by work type
  getTemplatesByWorkType: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.workType = $workType
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t
    ORDER BY t.docNo
  `,
  
  // Get approved templates
  getApprovedTemplates: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.status = 'approved'
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t
    ORDER BY t.workType, t.docNo
  `,
  
  // Get templates pending approval
  getTemplatesPendingApproval: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
    WHERE t.approvalStatus = 'pending'
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t
    ORDER BY t.revisionDate DESC
  `,
  
  // Create ITP template
  createTemplate: `
    CREATE (t:ITP_Template $properties)
    SET t.id = randomUUID()
    SET t.createdAt = datetime()
    SET t.updatedAt = datetime()
    SET t.status = coalesce(t.status, 'draft')
    SET t.approvalStatus = coalesce(t.approvalStatus, 'not_required')
    SET t.revisionNumber = coalesce(t.revisionNumber, 'A')
    WITH t
    MATCH (p:Project {id: $projectId})
    CREATE (t)-[:BELONGS_TO_PROJECT]->(p)
    RETURN t
  `,
  
  // Update ITP template
  updateTemplate: `
    MATCH (t:ITP_Template {id: $templateId})
    SET t += $properties
    SET t.updatedAt = datetime()
    RETURN t
  `,
  
  // Approve ITP template
  approveTemplate: `
    MATCH (t:ITP_Template {id: $templateId})
    SET t.approvalStatus = 'approved'
    SET t.status = 'approved'
    SET t.approvedDate = datetime()
    SET t.approvedBy = $userId
    SET t.updatedAt = datetime()
    RETURN t
  `,
  
  // Create new revision (supersede old template)
  createRevision: `
    MATCH (old:ITP_Template {id: $oldTemplateId})
    CREATE (new:ITP_Template)
    SET new = old
    SET new.id = randomUUID()
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
    RETURN new
  `,
  
  // Soft delete template
  deleteTemplate: `
    MATCH (t:ITP_Template {id: $templateId})
    SET t.isDeleted = true
    SET t.deletedAt = datetime()
    SET t.updatedAt = datetime()
    RETURN t
  `,
  
  // Get template statistics
  getTemplateStatistics: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(t:ITP_Template)
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

