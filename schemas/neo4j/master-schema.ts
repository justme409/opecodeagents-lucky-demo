import { z } from 'zod';

/**
 * ============================================================================
 * MASTER PROJECT SCHEMA - FLAT STRUCTURE
 * ============================================================================
 * 
 * Organization: Flat list with metadata tags
 * 
 * Benefits:
 * - Simplest structure - easy to scan
 * - Quick lookups by entity type
 * - Minimal nesting
 * - Easy to generate documentation
 * 
 * Structure:
 * - All entities at top level
 * - Metadata tags for: agent, pages, relationships
 * - Simple imports for any use case
 */

// ============================================================================
// METADATA TYPES
// ============================================================================

export interface EntityMetadata {
  // Which agent(s) create this entity
  createdBy: Array<{
    agent: string;
    prompt: string;
  }>;
  
  // Which pages display this entity
  displayedOn: string[];
  
  // What relationships this entity has
  relationships: {
    outgoing?: Array<{ type: string; target: string; description: string }>;
    incoming?: Array<{ type: string; source: string; description: string }>;
  };
}

export const JURISDICTION_VALUES = [
  'QLD, Queensland',
  'SA, South Australia',
  'NSW, New South Wales',
  'VIC, Victoria',
  'WA, Western Australia',
  'TAS, Tasmania',
  'NT, Northern Territory',
  'ACT, Australian Capital Territory',
  'Other',
] as const;

export type JurisdictionValue = typeof JURISDICTION_VALUES[number];

export const JURISDICTION_AGENCIES: Record<JurisdictionValue, string> = {
  'QLD, Queensland': 'Department of Transport and Main Roads',
  'SA, South Australia': 'Department for Infrastructure and Transport',
  'NSW, New South Wales': 'Transport for NSW',
  'VIC, Victoria': 'Department of Transport and Planning',
  'WA, Western Australia': 'Main Roads Western Australia',
  'TAS, Tasmania': 'Department of State Growth',
  'NT, Northern Territory': 'Department of Infrastructure, Planning and Logistics',
  'ACT, Australian Capital Territory': 'Transport Canberra and City Services Directorate',
  Other: 'Other',
};

export function getJurisdictionAgency(jurisdiction: JurisdictionValue): string {
  return JURISDICTION_AGENCIES[jurisdiction];
}

// ============================================================================
// ALL ENTITIES (Alphabetical)
// ============================================================================

/**
 * AREA CODE
 * Reference data for construction area codes
 */
export interface AreaCodeNode {
  projectId: string;  // Foreign key to Project
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const AreaCodeMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/settings',
    '/projects/[projectId]/lots',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Area code belongs to project' },
    ],
    incoming: [
      { type: 'IN_AREA', source: 'Lot', description: 'Lots are located in this area' },
    ],
  },
};

export const AreaCodeSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const CreateAreaCodeInputSchema = z.object({
  code: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type CreateAreaCodeInput = z.infer<typeof CreateAreaCodeInputSchema>;

export const UpdateAreaCodeInputSchema = z.object({
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateAreaCodeInput = z.infer<typeof UpdateAreaCodeInputSchema>;

export const AREA_CODE_QUERIES = {
  getAllAreaCodes: `
    MATCH (a:AreaCode {projectId: $projectId})
    WHERE COALESCE(a.isDeleted, false) = false
    RETURN a
    ORDER BY a.code
  `,
  getAreaCodeByCode: `
    MATCH (a:AreaCode {projectId: $projectId, code: $code})
    WHERE COALESCE(a.isDeleted, false) = false
    RETURN a
  `,
  createAreaCode: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (a:AreaCode {
      projectId: $projectId,
      code: $properties.code,
      description: $properties.description,
      metadata: COALESCE($properties.metadata, {}),
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (a)-[:BELONGS_TO_PROJECT]->(p)
    RETURN a
  `,
  updateAreaCode: `
    MATCH (a:AreaCode {projectId: $projectId, code: $code})
    WHERE COALESCE(a.isDeleted, false) = false
    SET a.description = COALESCE($properties.description, a.description),
        a.metadata = COALESCE($properties.metadata, a.metadata),
        a.updatedAt = datetime()
    RETURN a
  `,
  deleteAreaCode: `
    MATCH (a:AreaCode {projectId: $projectId, code: $code})
    WHERE COALESCE(a.isDeleted, false) = false
    SET a.isDeleted = true,
        a.updatedAt = datetime()
    RETURN a
  `,
};

// ----------------------------------------------------------------------------

/**
 * DOCUMENT
 * Document and drawing register with revisions
 */
export interface DocumentNode {
  projectId: string;  // Foreign key to Project
  documentNumber: string;
  revisionCode: string;
  docKind: 'drawing' | 'document';
  title: string;
  type: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'other';
  discipline?: 'civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'other';
  status: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived';
  issueDate?: Date;
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const DocumentMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'document-metadata', prompt: '@prompts/document-metadata.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/documents',
    '/projects/[projectId]/documents/[docId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Document belongs to project' },
      { type: 'SUPERSEDES', target: 'Document', description: 'This revision supersedes older revision' },
    ],
    incoming: [
      { type: 'REFERENCES_DOCUMENT', source: 'WBSNode', description: 'WBS nodes reference this document' },
      { type: 'REFERENCES_DOCUMENT', source: 'LBSNode', description: 'LBS nodes reference this document' },
      { type: 'REFERENCES_DOCUMENT', source: 'ITPTemplate', description: 'ITP templates reference this document' },
    ],
  },
};

export const DocumentSchema = z.object({
  projectId: z.string(),
  documentNumber: z.string(),
  revisionCode: z.string(),
  docKind: z.enum(['drawing', 'document']),
  title: z.string(),
  type: z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'other']),
  discipline: z.enum(['civil', 'structural', 'electrical', 'mechanical', 'architectural', 'other']).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']),
  issueDate: z.coerce.date().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
});

export const CreateDocumentInputSchema = z.object({
  documentNumber: z.string(),
  revisionCode: z.string().default('A'),
  docKind: z.enum(['drawing', 'document']).default('document'),
  title: z.string(),
  type: z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'other']).default('other'),
  discipline: z.enum(['civil', 'structural', 'electrical', 'mechanical', 'architectural', 'other']).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']).default('draft'),
  issueDate: z.coerce.date().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

export const UpdateDocumentInputSchema = z.object({
  revisionCode: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'other']).optional(),
  discipline: z.enum(['civil', 'structural', 'electrical', 'mechanical', 'architectural', 'other']).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']).optional(),
  issueDate: z.coerce.date().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
});

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;

export const DOCUMENT_QUERIES = {
  getAllDocuments: `
    MATCH (d:Document {projectId: $projectId})
    WHERE COALESCE(d.isDeleted, false) = false
    RETURN d
    ORDER BY d.documentNumber, d.revisionCode DESC
  `,
  getDocumentByNumber: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber})
    WHERE COALESCE(d.isDeleted, false) = false
    RETURN d
    ORDER BY d.revisionCode DESC
  `,
  createDocument: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (d:Document {
      projectId: $projectId,
      documentNumber: $properties.documentNumber,
      revisionCode: COALESCE($properties.revisionCode, 'A'),
      docKind: COALESCE($properties.docKind, 'document'),
      title: $properties.title,
      type: COALESCE($properties.type, 'other'),
      discipline: $properties.discipline,
      status: COALESCE($properties.status, 'draft'),
      issueDate: CASE
        WHEN $properties.issueDate IS NULL THEN null
        ELSE datetime($properties.issueDate)
      END,
      fileUrl: $properties.fileUrl,
      fileName: $properties.fileName,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (d)-[:BELONGS_TO_PROJECT]->(p)
    RETURN d
  `,
  updateDocument: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber})
    WHERE COALESCE(d.isDeleted, false) = false
    SET d += $properties,
        d.issueDate = CASE
          WHEN $properties.issueDate IS NULL THEN d.issueDate
          ELSE datetime($properties.issueDate)
        END,
        d.updatedAt = datetime()
    RETURN d
  `,
  deleteDocument: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber})
    WHERE COALESCE(d.isDeleted, false) = false
    SET d.isDeleted = true,
        d.updatedAt = datetime()
    RETURN d
  `,
};

// ----------------------------------------------------------------------------

/**
 * INSPECTION POINT
 * Individual inspection/test points within ITPs
 */
export interface InspectionPointNode {
  projectId: string;  // Foreign key to Project
  parentType: 'template' | 'instance';
  parentKey: string;
  sequence: number;
  description: string;
  type: 'hold' | 'witness' | 'surveillance' | 'record';
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  section?: 'preliminaries' | 'materials' | 'pre_construction' | 'construction' | 'geometrics' | 'conformance';
  requirement: string;
  acceptanceCriteria?: string;
  testMethod?: string;
  testFrequency?: string;
  standardsRef?: string[];
  isHoldPoint: boolean;
  isWitnessPoint: boolean;
  responsibleParty?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const InspectionPointMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'pqp-generation', prompt: '@prompts/pqp-generation.md' },
    { agent: 'itp-generation', prompt: '@prompts/itp-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/quality/itps/[docNo]',
    '/projects/[projectId]/lots/[lotId]/inspections',
  ],
  relationships: {
    outgoing: [
      { type: 'USES_TEST_METHOD', target: 'TestMethod', description: 'Point uses test method' },
      { type: 'REFERENCES_STANDARD', target: 'Standard', description: 'Point references standards' },
    ],
    incoming: [
      { type: 'HAS_POINT', source: 'ITPTemplate', description: 'Template has this point' },
      { type: 'HAS_POINT', source: 'ITPInstance', description: 'Instance has this point' },
    ],
  },
};

export const InspectionPointSchema = z.object({
  projectId: z.string(),
  parentType: z.enum(['template', 'instance']),
  parentKey: z.string(),
  sequence: z.number(),
  description: z.string(),
  type: z.enum(['hold', 'witness', 'surveillance', 'record']),
  requirement: z.string(),
  isHoldPoint: z.boolean(),
  isWitnessPoint: z.boolean(),
});

export const INSPECTION_POINT_QUERIES = {
  getAllPoints: `
    MATCH (ip:InspectionPoint {projectId: $projectId})
    WHERE COALESCE(ip.isDeleted, false) = false
    RETURN ip
    ORDER BY ip.sequence
  `,
  getPendingPoints: `
    MATCH (ip:InspectionPoint {projectId: $projectId, status: 'pending'})
    WHERE COALESCE(ip.isDeleted, false) = false
    RETURN ip
    ORDER BY ip.sequence
  `,
  getHoldPoints: `
    MATCH (ip:InspectionPoint {projectId: $projectId, type: 'hold'})
    WHERE COALESCE(ip.isDeleted, false) = false
    RETURN ip
    ORDER BY ip.sequence
  `,
  createPoint: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (ip:InspectionPoint {
      projectId: $projectId,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    SET ip += $properties
    MERGE (ip)-[:BELONGS_TO_PROJECT]->(p)
    RETURN ip
  `,
};

// ----------------------------------------------------------------------------

/**
 * ITP INSTANCE
 * Lot-specific instance of an ITP template
 */
export interface ITPInstanceNode {
  projectId: string;  // Foreign key to Project
  lotNumber: string;
  templateDocNo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  startDate?: Date;
  completedDate?: Date;
  approvedDate?: Date;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ITPInstanceMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'SCRIPT', prompt: 'scripts/create-lot.ts' },
  ],
  displayedOn: [
    '/projects/[projectId]/lots/[lotId]',
    '/projects/[projectId]/lots/[lotId]/inspections',
  ],
  relationships: {
    outgoing: [
      { type: 'INSTANCE_OF', target: 'ITPTemplate', description: 'Instance created from template' },
      { type: 'FOR_LOT', target: 'Lot', description: 'Instance is for specific lot' },
      { type: 'HAS_POINT', target: 'InspectionPoint', description: 'Instance has inspection points' },
    ],
    incoming: [
      { type: 'IMPLEMENTS', source: 'Lot', description: 'Lot implements this instance' },
    ],
  },
};

export const ITPInstanceSchema = z.object({
  projectId: z.string(),
  lotNumber: z.string(),
  templateDocNo: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'approved']),
  startDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateITPInstanceInputSchema = z.object({
  lotNumber: z.string(),
  templateDocNo: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'approved']).default('pending'),
  startDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateITPInstanceInput = z.infer<typeof CreateITPInstanceInputSchema>;

export const ITP_INSTANCE_QUERIES = {
  getAllInstances: `
    MATCH (i:ITPInstance {projectId: $projectId})
    WHERE COALESCE(i.isDeleted, false) = false
    RETURN i
    ORDER BY i.lotNumber, i.templateDocNo
  `,
  getInProgressInstances: `
    MATCH (i:ITPInstance {projectId: $projectId, status: 'in_progress'})
    WHERE COALESCE(i.isDeleted, false) = false
    RETURN i
    ORDER BY i.lotNumber
  `,
  getInstancesByLot: `
    MATCH (i:ITPInstance {projectId: $projectId, lotNumber: $lotNumber})
    WHERE COALESCE(i.isDeleted, false) = false
    RETURN i
    ORDER BY i.templateDocNo
  `,
  createInstance: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (i:ITPInstance {
      projectId: $projectId,
      lotNumber: $lotNumber,
      templateDocNo: $templateDocNo,
      status: coalesce($status, 'pending'),
      startDate: $startDate,
      notes: $notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    SET i += coalesce($properties, {})
    MERGE (i)-[:BELONGS_TO_PROJECT]->(p)
    RETURN i
  `,
};

// ----------------------------------------------------------------------------

/**
 * ITP TEMPLATE
 * Global, reusable ITP template
 */
export interface ITPTemplateNode {
  projectId: string;  // Foreign key to Project
  docNo: string;
  description: string;
  workType: string;
  specRef: string;
  parentSpec?: string;
  jurisdiction?: JurisdictionValue;
  agency?: string;
  applicableStandards?: string[];
  scopeOfWork?: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  revisionDate: Date;
  revisionNumber: string;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const ITPTemplateMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'pqp-generation', prompt: '@prompts/pqp-generation.md' },
    { agent: 'itp-generation', prompt: '@prompts/itp-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/quality/pqp',
    '/projects/[projectId]/quality/itps',
    '/projects/[projectId]/quality/itps/[docNo]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Template belongs to project' },
      { type: 'USES_WORK_TYPE', target: 'WorkType', description: 'Template for specific work type' },
      { type: 'REFERENCES_STANDARD', target: 'Standard', description: 'Template references standards' },
      { type: 'REFERENCES_DOCUMENT', target: 'Document', description: 'Template references documents' },
      { type: 'HAS_POINT', target: 'InspectionPoint', description: 'Template has inspection points' },
    ],
    incoming: [
      { type: 'INSTANCE_OF', source: 'ITPInstance', description: 'Instances created from this template' },
      { type: 'REQUIRES_ITP', source: 'WBSNode', description: 'WBS nodes require this ITP' },
    ],
  },
};

export const ITPTemplateSchema = z.object({
  projectId: z.string(),
  docNo: z.string(),
  description: z.string(),
  workType: z.string(),
  specRef: z.string(),
  parentSpec: z.string().optional(),
  jurisdiction: z.enum(JURISDICTION_VALUES).optional(),
  agency: z.string().optional(),
  applicableStandards: z.array(z.string()).optional(),
  scopeOfWork: z.string().optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
  approvalStatus: z.enum(['not_required', 'pending', 'approved', 'rejected']),
  revisionDate: z.coerce.date(),
  revisionNumber: z.string(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const CreateITPTemplateInputSchema = z.object({
  docNo: z.string(),
  description: z.string(),
  workType: z.string(),
  specRef: z.string(),
  parentSpec: z.string().optional(),
  jurisdiction: z.enum(JURISDICTION_VALUES).optional(),
  agency: z.string().optional(),
  applicableStandards: z.array(z.string()).optional(),
  scopeOfWork: z.string().optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded']).default('draft'),
  approvalStatus: z.enum(['not_required', 'pending', 'approved', 'rejected']).default('pending'),
  revisionDate: z.coerce.date(),
  revisionNumber: z.string(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateITPTemplateInput = z.infer<typeof CreateITPTemplateInputSchema>;

export const ITP_TEMPLATE_QUERIES = {
  getAllTemplates: `
    MATCH (t:ITPTemplate {projectId: $projectId})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.docNo
  `,
  getTemplatesByWorkType: `
    MATCH (t:ITPTemplate {projectId: $projectId, workType: $workType})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.docNo
  `,
  getApprovedTemplates: `
    MATCH (t:ITPTemplate {projectId: $projectId, status: 'approved'})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.docNo
  `,
  getTemplatesPendingApproval: `
    MATCH (t:ITPTemplate {projectId: $projectId, approvalStatus: 'pending'})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.docNo
  `,
  getByDocNo: `
    MATCH (t:ITPTemplate {projectId: $projectId, docNo: $docNo})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
  `,
  getTemplateWithPoints: `
    MATCH (t:ITPTemplate {projectId: $projectId, docNo: $docNo})
    WHERE COALESCE(t.isDeleted, false) = false
    OPTIONAL MATCH (t)-[:HAS_POINT]->(relIp:InspectionPoint)
    WHERE COALESCE(relIp.isDeleted, false) = false
    WITH t, collect(relIp) AS relPoints
    OPTIONAL MATCH (propIp:InspectionPoint {projectId: $projectId, parentType: 'template', parentKey: $docNo})
    WHERE COALESCE(propIp.isDeleted, false) = false
    WITH t, relPoints, collect(propIp) AS propPoints
    WITH t, relPoints + propPoints AS combinedPoints
    UNWIND combinedPoints AS point
    WITH t, point
    WHERE point IS NOT NULL
    WITH t, point
    ORDER BY point.sequence
    RETURN t AS template, collect(DISTINCT point) AS points
  `,
  createTemplate: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (t:ITPTemplate {
      projectId: $projectId,
      docNo: $docNo,
      description: $description,
      workType: $workType,
      specRef: $specRef,
      jurisdiction: $jurisdiction,
      agency: $agency,
      applicableStandards: $applicableStandards,
      scopeOfWork: $scopeOfWork,
      status: coalesce($status, 'draft'),
      approvalStatus: coalesce($approvalStatus, 'pending'),
      revisionDate: $revisionDate,
      revisionNumber: $revisionNumber,
      approvedBy: $approvedBy,
      approvedDate: $approvedDate,
      notes: $notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (t)-[:BELONGS_TO_PROJECT]->(p)
    RETURN t
  `,
};

// ----------------------------------------------------------------------------

/**
 * LABORATORY
 * Testing laboratory details
 */
export interface LaboratoryNode {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  nataNumber?: string;
  accreditations?: string[];
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LaboratoryMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/settings',
    '/projects/[projectId]/testing/samples',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Lab belongs to project' },
    ],
    incoming: [
      { type: 'SENT_TO_LAB', source: 'Sample', description: 'Samples sent to this lab' },
    ],
  },
};

export const LaboratorySchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  nataNumber: z.string().optional(),
});

export const LABORATORY_QUERIES = {
  getAll: `
    MATCH (l:Laboratory {projectId: $projectId})
    RETURN l
    ORDER BY l.name
  `,
  getByCode: `
    MATCH (l:Laboratory {projectId: $projectId, code: $code})
    RETURN l
  `,
};

// ----------------------------------------------------------------------------

/**
 * LBS NODE
 * Location Breakdown Structure node
 */
export interface LBSNodeType {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  type: 'site' | 'zone' | 'chainage' | 'layer' | 'element' | 'building' | 'floor';
  level: number;
  parentCode?: string;
  description?: string;
  chainageStart?: number;
  chainageEnd?: number;
  coordinates?: { lat: number; lng: number };
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const LBSNodeMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'lbs-extraction', prompt: '@prompts/lbs-extraction.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/structure/lbs',
    '/projects/[projectId]/structure/lbs/[code]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'LBS belongs to project' },
      { type: 'PARENT_OF', target: 'LBSNode', description: 'Parent-child hierarchy' },
      { type: 'LINKED_TO_WBS', target: 'WBSNode', description: 'Location linked to work' },
      { type: 'REFERENCES_DOCUMENT', target: 'Document', description: 'References drawings' },
    ],
    incoming: [
      { type: 'CHILD_OF', source: 'LBSNode', description: 'Child nodes' },
      { type: 'LOCATED_IN', source: 'Lot', description: 'Lots located in this area' },
    ],
  },
};

export const LBSNodeSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(['site', 'zone', 'chainage', 'layer', 'element', 'building', 'floor']),
  level: z.number(),
  parentCode: z.string().optional(),
});

export const LBS_NODE_QUERIES = {
  getAll: `
    MATCH (l:LBSNode {projectId: $projectId})
    RETURN l
    ORDER BY l.code
  `,
  getByCode: `
    MATCH (l:LBSNode {projectId: $projectId, code: $code})
    RETURN l
  `,
};

// ----------------------------------------------------------------------------

/**
 * LOT
 * Discrete work package for quality tracking
 */
export interface LotNode {
  projectId: string;  // Foreign key to Project
  number: string;
  status: 'open' | 'in_progress' | 'conformed' | 'closed';
  percentComplete: number;
  description: string;
  workType: string;
  areaCode: string;
  startChainage: number;
  endChainage: number;
  startDate: Date;
  conformedDate?: Date;
  closedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LotMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'SCRIPT', prompt: 'scripts/create-lot.ts' },
  ],
  displayedOn: [
    '/projects/[projectId]/lots',
    '/projects/[projectId]/lots/[lotId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Lot belongs to project' },
      { type: 'USES_WORK_TYPE', target: 'WorkType', description: 'Lot uses work type' },
      { type: 'IN_AREA', target: 'AreaCode', description: 'Lot in area' },
      { type: 'LOCATED_IN', target: 'LBSNode', description: 'Lot located in LBS node' },
      { type: 'COVERS_WBS', target: 'WBSNode', description: 'Lot covers WBS work' },
      { type: 'IMPLEMENTS', target: 'ITPInstance', description: 'Lot implements ITP instances' },
    ],
    incoming: [
      { type: 'FOR_LOT', source: 'ITPInstance', description: 'ITP instances for this lot' },
      { type: 'RELATED_TO', source: 'NCR', description: 'NCRs related to this lot' },
    ],
  },
};

export const LotStatusEnum = z.enum(['open', 'in_progress', 'conformed', 'closed']);

export const LotSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  status: LotStatusEnum,
  percentComplete: z.number(),
  description: z.string(),
  workType: z.string(),
  areaCode: z.string(),
  startChainage: z.number(),
  endChainage: z.number(),
  startDate: z.coerce.date(),
  notes: z.string().optional(),
});

export const CreateLotInputSchema = z.object({
  number: z.string(),
  description: z.string(),
  workType: z.string(),
  areaCode: z.string(),
  status: LotStatusEnum.default('open'),
  percentComplete: z.number().min(0).max(100).default(0),
  startChainage: z.coerce.number(),
  endChainage: z.coerce.number(),
  startDate: z.coerce.date(),
  notes: z.string().optional(),
});

export type CreateLotInput = z.infer<typeof CreateLotInputSchema>;

export const UpdateLotInputSchema = z.object({
  status: LotStatusEnum.optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  workType: z.string().optional(),
  areaCode: z.string().optional(),
  startChainage: z.coerce.number().optional(),
  endChainage: z.coerce.number().optional(),
  startDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type UpdateLotInput = z.infer<typeof UpdateLotInputSchema>;

export interface LotWithRelationships extends LotNode {
  relationships: {
    belongsToProject: string;
    implements: string[];
    hasNCR: string[];
    hasTest: string[];
    usesMaterial: string[];
    hasQuantity: string[];
    relatedDocuments: string[];
    relatedPhotos: string[];
  };
  itpInstances: ITPInstanceNode[];
  ncrs: NCRNode[];
  tests: TestRequestNode[];
  materials: MaterialNode[];
  quantities: QuantityNode[];
  documents: DocumentNode[];
  photos: PhotoNode[];
}

export const LOT_QUERIES = {
  getAllLots: `
    MATCH (l:Lot {projectId: $projectId})
    WHERE COALESCE(l.isDeleted, false) = false
    RETURN l
    ORDER BY l.number
  `,
  getLotsByStatus: `
    MATCH (l:Lot {projectId: $projectId, status: $status})
    WHERE COALESCE(l.isDeleted, false) = false
    RETURN l
    ORDER BY l.number
  `,
  getLotsByWorkType: `
    MATCH (l:Lot {projectId: $projectId, workType: $workType})
    WHERE COALESCE(l.isDeleted, false) = false
    RETURN l
    ORDER BY l.number
  `,
  getLotDetail: `
    MATCH (l:Lot {projectId: $projectId, number: $number})
    WHERE COALESCE(l.isDeleted, false) = false
    OPTIONAL MATCH (l)-[:IMPLEMENTS]->(inst:ITPInstance)
    OPTIONAL MATCH (l)<-[:RELATED_TO]-(n:NCR)
    OPTIONAL MATCH (l)<-[:FOR_LOT]-(test:TestRequest)
    OPTIONAL MATCH (l)-[:USES_MATERIAL]->(m:Material)
    OPTIONAL MATCH (l)-[:HAS_QUANTITY]->(q:Quantity)
    OPTIONAL MATCH (l)<-[:REFERENCES]-(doc:Document)
    OPTIONAL MATCH (l)<-[:RELATED_TO]-(photo:Photo)
    WITH l,
         collect(DISTINCT inst) AS insts,
         collect(DISTINCT n) AS ncrs,
         collect(DISTINCT test) AS tests,
         collect(DISTINCT m) AS materials,
         collect(DISTINCT q) AS quantities,
         collect(DISTINCT doc) AS documents,
         collect(DISTINCT photo) AS photos
    RETURN l {
      .* ,
      id: toString(id(l)),
      itpInstances: insts,
      ncrs: ncrs,
      tests: tests,
      materials: materials,
      quantities: quantities,
      documents: documents,
      photos: photos,
      relationships: {
        belongsToProject: l.projectId,
        implements: [inst IN insts | toString(id(inst))],
        hasNCR: [n IN ncrs | toString(id(n))],
        hasTest: [t IN tests | toString(id(t))],
        usesMaterial: [m IN materials | toString(id(m))],
        hasQuantity: [q IN quantities | toString(id(q))],
        relatedDocuments: [d IN documents | toString(id(d))],
        relatedPhotos: [p IN photos | toString(id(p))]
      }
    }
  `,
  createLot: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (l:Lot {
      projectId: $projectId,
      number: $number,
      status: coalesce($status, 'open'),
      percentComplete: coalesce($percentComplete, 0),
      description: $description,
      workType: $workType,
      areaCode: $areaCode,
      startChainage: $startChainage,
      endChainage: $endChainage,
      startDate: $startDate,
      notes: $notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (l)-[:BELONGS_TO_PROJECT]->(p)
    RETURN l
  `,
  updateLot: `
    MATCH (l:Lot {projectId: $projectId, number: $number})
    WHERE COALESCE(l.isDeleted, false) = false
    SET l += $properties,
        l.updatedAt = datetime()
    RETURN l
  `,
  updateLotStatus: `
    MATCH (l:Lot {projectId: $projectId, number: $number})
    WHERE COALESCE(l.isDeleted, false) = false
    SET l.status = $status,
        l.updatedAt = datetime()
    RETURN l
  `,
  deleteLot: `
    MATCH (l:Lot {projectId: $projectId, number: $number})
    SET l.isDeleted = true,
        l.updatedAt = datetime()
    RETURN l
  `,
};

// ----------------------------------------------------------------------------

/**
 * MANAGEMENT PLAN
 * Project management plans (PQP, OHSMP, EMP, etc.)
 */
const ManagementPlanRequiredItpSchema = z.object({
  docNo: z.string(),
  workType: z.string(),
  mandatory: z.boolean(),
  specRef: z.string().optional(),
});

export type ManagementPlanRequiredItp = z.infer<typeof ManagementPlanRequiredItpSchema>;

export interface ManagementPlanNode {
  projectId: string;  // Foreign key to Project
  type: 'PQP' | 'OHSMP' | 'EMP' | 'CEMP' | 'TMP';
  title: string;
  version: string;
  approvalStatus: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvedBy?: string;
  approvedDate?: Date;
  summary?: string;
  htmlContent?: string;
  notes?: string;
  requiredItps?: ManagementPlanRequiredItp[];
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const ManagementPlanMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'pqp-generation', prompt: '@prompts/pqp-generation.md' },
    { agent: 'ohsmp-generation', prompt: '@prompts/ohsmp-generation.md' },
    { agent: 'emp-generation', prompt: '@prompts/emp-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/quality/pqp',
    '/projects/[projectId]/safety/ohsmp',
    '/projects/[projectId]/environment/emp',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Plan belongs to project' },
    ],
    incoming: [],
  },
};

export const ManagementPlanSchema = z.object({
  projectId: z.string(),
  type: z.enum(['PQP', 'OHSMP', 'EMP', 'CEMP', 'TMP']),
  title: z.string(),
  version: z.string(),
  approvalStatus: z.enum(['draft', 'in_review', 'approved', 'superseded']),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  summary: z.string().optional(),
  htmlContent: z.string().optional(),
  notes: z.string().optional(),
  requiredItps: z.array(ManagementPlanRequiredItpSchema).optional(),
});

export const CreateManagementPlanInputSchema = z.object({
  type: z.enum(['PQP', 'OHSMP', 'EMP', 'CEMP', 'TMP']),
  title: z.string(),
  version: z.string().default('1.0'),
  approvalStatus: z.enum(['draft', 'in_review', 'approved', 'superseded']).default('draft'),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  summary: z.string().optional(),
  htmlContent: z.string().optional(),
  notes: z.string().optional(),
  requiredItps: z.array(ManagementPlanRequiredItpSchema).optional(),
});

export type CreateManagementPlanInput = z.infer<typeof CreateManagementPlanInputSchema>;

export const UpdateManagementPlanInputSchema = z.object({
  title: z.string().optional(),
  version: z.string().optional(),
  approvalStatus: z.enum(['draft', 'in_review', 'approved', 'superseded']).optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  summary: z.string().optional(),
  htmlContent: z.string().optional(),
  notes: z.string().optional(),
  requiredItps: z.array(ManagementPlanRequiredItpSchema).optional(),
});

export type UpdateManagementPlanInput = z.infer<typeof UpdateManagementPlanInputSchema>;

export const MANAGEMENT_PLAN_QUERIES = {
  getAllPlans: `
    MATCH (m:ManagementPlan {projectId: $projectId})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.type, m.version DESC
  `,
  getPlanById: `
    MATCH (m:ManagementPlan {projectId: $projectId})
    WHERE id(m) = toInteger($planId) OR elementId(m) = $planId
    RETURN m
  `,
  getPlanByType: `
    MATCH (m:ManagementPlan {projectId: $projectId, type: $type})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.version DESC
  `,
  createPlan: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (m:ManagementPlan {
      projectId: $projectId,
      type: $properties.type,
      title: $properties.title,
      version: COALESCE($properties.version, '1.0'),
      approvalStatus: COALESCE($properties.approvalStatus, 'draft'),
      approvedBy: $properties.approvedBy,
      approvedDate: CASE
        WHEN $properties.approvedDate IS NULL THEN null
        ELSE datetime($properties.approvedDate)
      END,
      summary: $properties.summary,
      htmlContent: $properties.htmlContent,
      requiredItps: coalesce($properties.requiredItps, []),
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (m)-[:BELONGS_TO_PROJECT]->(p)
    RETURN m
  `,
  updatePlan: `
    MATCH (m:ManagementPlan {projectId: $projectId, id: $planId})
    WHERE COALESCE(m.isDeleted, false) = false
    SET m += $properties,
        m.approvedDate = CASE
          WHEN $properties.approvedDate IS NULL THEN m.approvedDate
          ELSE datetime($properties.approvedDate)
        END,
        m.updatedAt = datetime()
    RETURN m
  `,
  deletePlan: `
    MATCH (m:ManagementPlan {projectId: $projectId, id: $planId})
    WHERE COALESCE(m.isDeleted, false) = false
    SET m.isDeleted = true,
        m.updatedAt = datetime()
    RETURN m
  `,
};

// ----------------------------------------------------------------------------

/**
 * MATERIAL
 * Construction materials with approvals
 */
export interface MaterialNode {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  type: string;
  supplier: string;
  specification: string;
  productCode?: string;
  batchNumber?: string;
  certificateId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const MaterialMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry or import' },
  ],
  displayedOn: [
    '/projects/[projectId]/materials',
    '/projects/[projectId]/materials/[code]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Material belongs to project' },
      { type: 'SUPPLIED_BY', target: 'Supplier', description: 'Material supplied by supplier' },
    ],
    incoming: [
      { type: 'USES_MATERIAL', source: 'Lot', description: 'Lots use this material' },
      { type: 'TESTS_MATERIAL', source: 'TestRequest', description: 'Tests for this material' },
    ],
  },
};

export const MaterialSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  supplier: z.string(),
  specification: z.string(),
  productCode: z.string().optional(),
  batchNumber: z.string().optional(),
  certificateId: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
});

export const CreateMaterialInputSchema = z.object({
  code: z.string().optional(),
  name: z.string(),
  type: z.string(),
  supplier: z.string(),
  specification: z.string(),
  productCode: z.string().optional(),
  batchNumber: z.string().optional(),
  certificateId: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  notes: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialInputSchema>;

export const UpdateMaterialInputSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  supplier: z.string().optional(),
  specification: z.string().optional(),
  productCode: z.string().optional(),
  batchNumber: z.string().optional(),
  certificateId: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
});

export type UpdateMaterialInput = z.infer<typeof UpdateMaterialInputSchema>;

export const MATERIAL_QUERIES = {
  getAllMaterials: `
    MATCH (m:Material {projectId: $projectId})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.name
  `,
  getApprovedMaterials: `
    MATCH (m:Material {projectId: $projectId, approvalStatus: 'approved'})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.name
  `,
  getMaterialByCode: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
  `,
  createMaterial: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (m:Material {
      projectId: $projectId,
      code: coalesce($properties.code, toString(randomUUID())),
      name: $properties.name,
      type: $properties.type,
      supplier: $properties.supplier,
      specification: $properties.specification,
      productCode: $properties.productCode,
      batchNumber: $properties.batchNumber,
      certificateId: $properties.certificateId,
      approvalStatus: coalesce($properties.approvalStatus, 'pending'),
      notes: $properties.notes,
      approvedBy: $properties.approvedBy,
      approvedDate: $properties.approvedDate,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (m)-[:BELONGS_TO_PROJECT]->(p)
    RETURN m
  `,
  updateMaterial: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    WHERE COALESCE(m.isDeleted, false) = false
    SET m += $properties,
        m.updatedAt = datetime()
    RETURN m
  `,
  deleteMaterial: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    SET m.isDeleted = true,
        m.updatedAt = datetime()
    RETURN m
  `,
};

// ----------------------------------------------------------------------------

/**
 * MIX DESIGN
 * Concrete or material mix designs
 */
export interface MixDesignNode {
  projectId: string;  // Foreign key to Project
  code: string;
  description: string;
  type: string;
  materialCode?: string;
  targetStrength?: number;
  slump?: number;
  components: Array<{
    material: string;
    quantity: number;
    unit: string;
  }>;
  status: 'draft' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const MixDesignMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MATERIAL_AGENT', prompt: 'Extract mix designs from specifications' },
  ],
  displayedOn: [
    '/projects/[projectId]/materials/mix-designs',
    '/projects/[projectId]/materials/mix-designs/[code]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Mix design belongs to project' },
      { type: 'FOR_MATERIAL', target: 'Material', description: 'Mix design for specific material' },
      { type: 'APPROVED_BY', target: 'User', description: 'Mix design approved by user' },
    ],
    incoming: [
      { type: 'USES_MIX_DESIGN', source: 'Lot', description: 'Lots use this mix design' },
    ],
  },
};

export const MixDesignSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  description: z.string(),
  type: z.string(),
  materialCode: z.string().optional(),
  targetStrength: z.number().optional(),
  slump: z.number().optional(),
  components: z.array(z.object({
    material: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).optional(),
  status: z.enum(['draft', 'approved', 'rejected']),
  notes: z.string().optional(),
});

export const CreateMixDesignInputSchema = z.object({
  code: z.string(),
  description: z.string(),
  type: z.string(),
  materialCode: z.string().optional(),
  targetStrength: z.number().optional(),
  slump: z.number().optional(),
  components: z.array(z.object({
    material: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).optional(),
  status: z.enum(['draft', 'approved', 'rejected']).default('draft'),
  notes: z.string().optional(),
});

export type CreateMixDesignInput = z.infer<typeof CreateMixDesignInputSchema>;

export const UpdateMixDesignInputSchema = z.object({
  description: z.string().optional(),
  type: z.string().optional(),
  materialCode: z.string().optional(),
  targetStrength: z.number().optional(),
  slump: z.number().optional(),
  components: z.array(z.object({
    material: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })).optional(),
  status: z.enum(['draft', 'approved', 'rejected']).optional(),
  notes: z.string().optional(),
});

export type UpdateMixDesignInput = z.infer<typeof UpdateMixDesignInputSchema>;

export const MIX_DESIGN_QUERIES = {
  getAllMixDesigns: `
    MATCH (m:MixDesign {projectId: $projectId})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.code
  `,
  getApprovedMixDesigns: `
    MATCH (m:MixDesign {projectId: $projectId, status: 'approved'})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
    ORDER BY m.code
  `,
  getMixDesignByCode: `
    MATCH (m:MixDesign {projectId: $projectId, code: $code})
    WHERE COALESCE(m.isDeleted, false) = false
    RETURN m
  `,
  createMixDesign: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (m:MixDesign {
      projectId: $projectId,
      code: $properties.code,
      description: $properties.description,
      type: $properties.type,
      materialCode: $properties.materialCode,
      targetStrength: $properties.targetStrength,
      slump: $properties.slump,
      components: coalesce($properties.components, []),
      status: coalesce($properties.status, 'draft'),
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (m)-[:BELONGS_TO_PROJECT]->(p)
    RETURN m
  `,
  updateMixDesign: `
    MATCH (m:MixDesign {projectId: $projectId, code: $code})
    WHERE COALESCE(m.isDeleted, false) = false
    SET m += $properties,
        m.updatedAt = datetime()
    RETURN m
  `,
  deleteMixDesign: `
    MATCH (m:MixDesign {projectId: $projectId, code: $code})
    SET m.isDeleted = true,
        m.updatedAt = datetime()
    RETURN m
  `,
};

// ----------------------------------------------------------------------------

/**
 * NCR (Non-Conformance Report)
 * Quality issues and defects
 */
export interface NCRNode {
  projectId: string;  // Foreign key to Project
  number: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'investigation' | 'resolution_proposed' | 'approved' | 'closed';
  raisedDate: Date;
  raisedBy: string;
  lotNumber?: string;
  inspectionPointRef?: string;
  rootCause?: string;
  proposedResolution?: string;
  approvedResolution?: string;
  resolvedBy?: string;
  resolvedDate?: Date;
  closedDate?: Date;
  closedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const NCRMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry during inspections' },
  ],
  displayedOn: [
    '/projects/[projectId]/quality/ncrs',
    '/projects/[projectId]/quality/ncrs/[number]',
    '/projects/[projectId]/lots/[lotId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'NCR belongs to project' },
      { type: 'RELATED_TO', target: 'Lot', description: 'NCR related to lot' },
      { type: 'REPORTED_BY', target: 'User', description: 'User reported NCR' },
      { type: 'RESOLVED_BY', target: 'User', description: 'User resolved NCR' },
    ],
    incoming: [],
  },
};

export const NCRSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  description: z.string(),
  severity: z.enum(['minor', 'major', 'critical']),
  status: z.enum(['open', 'investigation', 'resolution_proposed', 'approved', 'closed']),
  raisedDate: z.coerce.date(),
  raisedBy: z.string(),
  lotNumber: z.string().optional(),
  rootCause: z.string().optional(),
  proposedResolution: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const CreateNCRInputSchema = z.object({
  number: z.string().optional(),
  description: z.string(),
  severity: z.enum(['minor', 'major', 'critical']).default('minor'),
  lotNumber: z.string(),
  raisedBy: z.string(),
  rootCause: z.string().optional(),
  proposedResolution: z.string().optional(),
});

export type CreateNCRInput = z.infer<typeof CreateNCRInputSchema>;

export const NCR_QUERIES = {
  getAllNCRs: `
    MATCH (n:NCR {projectId: $projectId})
    WHERE COALESCE(n.isDeleted, false) = false
    RETURN n
    ORDER BY n.raisedDate DESC
  `,
  getOpenNCRs: `
    MATCH (n:NCR {projectId: $projectId})
    WHERE COALESCE(n.isDeleted, false) = false
      AND n.status IN ['open', 'investigation', 'resolution_proposed']
    RETURN n
    ORDER BY n.raisedDate DESC
  `,
  getByNumber: `
    MATCH (n:NCR {projectId: $projectId, number: $number})
    WHERE COALESCE(n.isDeleted, false) = false
    RETURN n
  `,
  createNCR: `
    MATCH (p:Project {projectId: $projectId})
    OPTIONAL MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    CREATE (n:NCR {
      projectId: $projectId,
      number: coalesce($number, toString(randomUUID())),
      description: $description,
      severity: coalesce($severity, 'minor'),
      status: 'open',
      raisedDate: datetime(),
      raisedBy: $raisedBy,
      lotNumber: $lotNumber,
      rootCause: $rootCause,
      proposedResolution: $proposedResolution,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (n)-[:BELONGS_TO_PROJECT]->(p)
    FOREACH (_ IN CASE WHEN l IS NULL THEN [] ELSE [1] END |
      MERGE (n)-[:RELATED_TO]->(l)
    )
    RETURN n
  `,
};

// ----------------------------------------------------------------------------

/**
 * PROJECT
 * Root project node
 */
export interface ProjectNode {
  projectId: string;  // PRIMARY KEY - matches Neo4j implementation
  projectName: string;  // REQUIRED - Primary project name
  projectCode?: string;  // Internal project code
  contractNumber?: string;  // Contract identifier
  projectDescription?: string;  // One-sentence overview
  scopeSummary?: string;  // Brief summary of work scope
  projectAddress?: string;  // Physical site address
  stateTerritory?: string;  // Australian state/territory
  jurisdiction?: JurisdictionValue;  // Governing jurisdiction
  agency?: string;  // Responsible road agency
  localCouncil?: string;  // Local authority/council name
  contractValue?: string;  // Monetary value with currency
  procurementMethod?: string;  // Contract type (D&C, EPC, lump sum, etc.)
  regulatoryFramework?: string;  // Governing legislation
  applicableStandards?: string[];  // Referenced standards and codes
  parties?: string;  // JSON string with client, principal, parties_mentioned_in_docs
  keyDates?: {
    commencementDate?: string;
    practicalCompletionDate?: string;
    defectsLiabilityPeriod?: string;
  };
  sourceDocuments?: string[];  // Document IDs used for extraction
  htmlContent?: string;  // Complete HTML string (NOT a file path)
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export const ProjectMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
  ],
  displayedOn: [
    '/projects/[projectId]',
    '/projects/[projectId]/settings',
  ],
  relationships: {
    outgoing: [],
    incoming: [
      { type: 'BELONGS_TO_PROJECT', source: 'ALL', description: 'All entities belong to project' },
      { type: 'BELONGS_TO_PROJECT', source: 'Party', description: 'Parties belong to project' },
    ],
  },
};

export const ProjectSchema = z.object({
  projectId: z.string(),  // PRIMARY KEY
  projectName: z.string(),
  projectCode: z.string().optional(),
  contractNumber: z.string().optional(),
  projectDescription: z.string().optional(),
  scopeSummary: z.string().optional(),
  projectAddress: z.string().optional(),
  stateTerritory: z.string().optional(),
  jurisdiction: z.enum(JURISDICTION_VALUES).optional(),
  agency: z.string().optional(),
  localCouncil: z.string().optional(),
  contractValue: z.string().optional(),
  procurementMethod: z.string().optional(),
  regulatoryFramework: z.string().optional(),
  applicableStandards: z.array(z.string()).optional(),
  parties: z.string().optional(),
  keyDates: z.object({
    commencementDate: z.string().optional(),
    practicalCompletionDate: z.string().optional(),
    defectsLiabilityPeriod: z.string().optional(),
  }).optional(),
  sourceDocuments: z.array(z.string()).optional(),
  htmlContent: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
});

export const PROJECT_QUERIES = {
  getProject: `
    MATCH (p:Project {projectId: $projectId})
    RETURN p as project
  `,
  getAllProjects: `
    MATCH (p:Project)
    RETURN p
    ORDER BY p.projectName
  `,
  create: `
    CREATE (p:Project {
      projectId: $projectId,
      projectName: $projectName,
      projectCode: $projectCode,
      contractNumber: $contractNumber,
      projectDescription: $projectDescription,
      scopeSummary: $scopeSummary,
      projectAddress: $projectAddress,
      stateTerritory: $stateTerritory,
      jurisdiction: $jurisdiction,
      agency: $agency,
      localCouncil: $localCouncil,
      contractValue: $contractValue,
      procurementMethod: $procurementMethod,
      regulatoryFramework: $regulatoryFramework,
      applicableStandards: $applicableStandards,
      parties: $parties,
      keyDates: $keyDates,
      sourceDocuments: $sourceDocuments,
      htmlContent: $htmlContent,
      status: $status,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN p
  `,
};

// ----------------------------------------------------------------------------

/**
 * SCHEDULE ITEM
 * Bill of Quantities item
 */
export interface ScheduleItemNode {
  projectId: string;  // Foreign key to Project
  number: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  category?: string;
  workTypeCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const ScheduleItemMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'qse-generation', prompt: '@prompts/qse-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/commercial/schedule',
    '/projects/[projectId]/commercial/schedule/[number]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Item belongs to project' },
      { type: 'CATEGORIZED_AS', target: 'WorkType', description: 'Item categorized by work type' },
    ],
    incoming: [
      { type: 'HAS_QUANTITY', source: 'Lot', description: 'Lots have quantities for this item' },
    ],
  },
};

export const ScheduleItemSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
  category: z.string().optional(),
  workTypeCode: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateScheduleItemInputSchema = z.object({
  number: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.number(),
  rate: z.number(),
  category: z.string().optional(),
  workTypeCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemInputSchema>;

export const UpdateScheduleItemInputSchema = z.object({
  description: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().optional(),
  rate: z.number().optional(),
  category: z.string().optional(),
  workTypeCode: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemInputSchema>;

export const SCHEDULE_ITEM_QUERIES = {
  getAllItems: `
    MATCH (s:ScheduleItem {projectId: $projectId})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
    ORDER BY s.number
  `,
  getItemByNumber: `
    MATCH (s:ScheduleItem {projectId: $projectId, number: $number})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
  `,
  createItem: `
    MATCH (p:Project {projectId: $projectId})
    WITH p, $properties AS props
    CREATE (s:ScheduleItem {
      projectId: $projectId,
      number: props.number,
      description: props.description,
      unit: props.unit,
      quantity: toFloat(props.quantity),
      rate: toFloat(props.rate),
      amount: toFloat(props.quantity) * toFloat(props.rate),
      category: props.category,
      workTypeCode: props.workTypeCode,
      notes: props.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (s)-[:BELONGS_TO_PROJECT]->(p)
    RETURN s
  `,
  updateItem: `
    MATCH (s:ScheduleItem {projectId: $projectId, number: $number})
    WHERE COALESCE(s.isDeleted, false) = false
    WITH s, $properties AS props
    SET s += props,
        s.quantity = COALESCE(toFloat(props.quantity), s.quantity),
        s.rate = COALESCE(toFloat(props.rate), s.rate),
        s.amount = COALESCE(toFloat(props.quantity), s.quantity) * COALESCE(toFloat(props.rate), s.rate),
        s.updatedAt = datetime()
    RETURN s
  `,
  deleteItem: `
    MATCH (s:ScheduleItem {projectId: $projectId, number: $number})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s.isDeleted = true,
        s.updatedAt = datetime()
    RETURN s
  `,
};

// ----------------------------------------------------------------------------

/**
 * PHOTO
 * Site photos and progress images
 */
export interface PhotoNode {
  projectId: string;  // Foreign key to Project
  url: string;
  description?: string;
  location?: string;
  takenBy: string;
  capturedAt?: Date;
  tags?: string[];
  fileName?: string;
  mimeType?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const PhotoMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual upload via mobile/web' },
  ],
  displayedOn: [
    '/projects/[projectId]/photos',
    '/projects/[projectId]/lots/[lotId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Photo belongs to project' },
      { type: 'TAKEN_BY', target: 'User', description: 'Photo taken by user' },
      { type: 'RELATED_TO', target: 'Lot', description: 'Photo related to lot' },
      { type: 'RELATED_TO', target: 'InspectionPoint', description: 'Photo related to inspection point' },
      { type: 'RELATED_TO', target: 'NCR', description: 'Photo related to NCR' },
    ],
    incoming: [],
  },
};

export const PhotoSchema = z.object({
  projectId: z.string(),
  url: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  takenBy: z.string(),
  capturedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});

export const CreatePhotoInputSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  location: z.string().optional(),
  takenBy: z.string(),
  capturedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
});

export type CreatePhotoInput = z.infer<typeof CreatePhotoInputSchema>;

export const PHOTO_QUERIES = {
  getAllPhotos: `
    MATCH (p:Photo {projectId: $projectId})
    WHERE COALESCE(p.isDeleted, false) = false
    RETURN p
    ORDER BY COALESCE(p.capturedAt, p.createdAt) DESC
  `,
  createPhoto: `
    MATCH (proj:Project {projectId: $projectId})
    CREATE (p:Photo {
      projectId: $projectId,
      url: $properties.url,
      description: $properties.description,
      location: $properties.location,
      takenBy: $properties.takenBy,
      capturedAt: CASE
        WHEN $properties.capturedAt IS NULL THEN datetime()
        ELSE datetime($properties.capturedAt)
      END,
      tags: coalesce($properties.tags, []),
      fileName: $properties.fileName,
      mimeType: $properties.mimeType,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (p)-[:BELONGS_TO_PROJECT]->(proj)
    RETURN p
  `,
  deletePhoto: `
    MATCH (p:Photo {projectId: $projectId, id: $photoId})
    WHERE COALESCE(p.isDeleted, false) = false
    SET p.isDeleted = true,
        p.updatedAt = datetime()
    RETURN p
  `,
};

// ----------------------------------------------------------------------------

/**
 * PROGRESS CLAIM
 * Progress payment claims
 */
export interface ProgressClaimNode {
  projectId: string;  // Foreign key to Project
  number: string;
  period: string;
  cutoffDate: Date;
  status: 'draft' | 'submitted' | 'under_review' | 'certified' | 'paid';
  claimedValue: number;
  certifiedValue?: number;
  submittedBy?: string;
  submittedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const ProgressClaimMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry by QS' },
  ],
  displayedOn: [
    '/projects/[projectId]/commercial/claims',
    '/projects/[projectId]/commercial/claims/[number]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Claim belongs to project' },
      { type: 'CLAIMS_ITEM', target: 'ScheduleItem', description: 'Claim includes schedule items' },
    ],
    incoming: [],
  },
};

export const ProgressClaimSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  period: z.string(),
  cutoffDate: z.coerce.date(),
  status: z.enum(['draft', 'submitted', 'under_review', 'certified', 'paid']),
  claimedValue: z.number(),
  certifiedValue: z.number().optional(),
  submittedBy: z.string().optional(),
  submittedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const CreateProgressClaimInputSchema = z.object({
  period: z.string(),
  cutoffDate: z.coerce.date(),
  status: z.enum(['draft', 'submitted', 'under_review', 'certified', 'paid']).default('draft'),
  claimedValue: z.number().default(0),
  certifiedValue: z.number().optional(),
  submittedBy: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateProgressClaimInput = z.infer<typeof CreateProgressClaimInputSchema>;

export const UpdateProgressClaimInputSchema = z.object({
  period: z.string().optional(),
  cutoffDate: z.coerce.date().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'certified', 'paid']).optional(),
  claimedValue: z.number().optional(),
  certifiedValue: z.number().optional(),
  submittedBy: z.string().optional(),
  submittedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type UpdateProgressClaimInput = z.infer<typeof UpdateProgressClaimInputSchema>;

export const PROGRESS_CLAIM_QUERIES = {
  getAllClaims: `
    MATCH (c:ProgressClaim {projectId: $projectId})
    WHERE COALESCE(c.isDeleted, false) = false
    RETURN c
    ORDER BY c.cutoffDate DESC
  `,
  getClaimByNumber: `
    MATCH (c:ProgressClaim {projectId: $projectId, number: $number})
    WHERE COALESCE(c.isDeleted, false) = false
    RETURN c
  `,
  createClaim: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (c:ProgressClaim {
      projectId: $projectId,
      number: coalesce($properties.number, toString(randomUUID())),
      period: $properties.period,
      cutoffDate: datetime($properties.cutoffDate),
      status: coalesce($properties.status, 'draft'),
      claimedValue: coalesce(toFloat($properties.claimedValue), 0),
      certifiedValue: coalesce(toFloat($properties.certifiedValue), 0),
      submittedBy: $properties.submittedBy,
      submittedDate: CASE
        WHEN $properties.submittedBy IS NULL THEN null
        ELSE datetime()
      END,
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (c)-[:BELONGS_TO_PROJECT]->(p)
    RETURN c
  `,
  updateClaim: `
    MATCH (c:ProgressClaim {projectId: $projectId, number: $number})
    WHERE COALESCE(c.isDeleted, false) = false
    SET c += {
          period: COALESCE($properties.period, c.period),
          status: COALESCE($properties.status, c.status),
          claimedValue: COALESCE(toFloat($properties.claimedValue), c.claimedValue),
          certifiedValue: COALESCE(toFloat($properties.certifiedValue), c.certifiedValue),
          submittedBy: COALESCE($properties.submittedBy, c.submittedBy),
          notes: COALESCE($properties.notes, c.notes)
        },
        c.cutoffDate = CASE
          WHEN $properties.cutoffDate IS NULL THEN c.cutoffDate
          ELSE datetime($properties.cutoffDate)
        END,
        c.submittedDate = CASE
          WHEN $properties.submittedDate IS NOT NULL THEN datetime($properties.submittedDate)
          WHEN $properties.submittedBy IS NOT NULL AND c.submittedDate IS NULL THEN datetime()
          ELSE c.submittedDate
        END,
        c.approvedBy = COALESCE($properties.approvedBy, c.approvedBy),
        c.approvedDate = CASE
          WHEN $properties.approvedDate IS NULL THEN c.approvedDate
          ELSE datetime($properties.approvedDate)
        END,
        c.updatedAt = datetime()
    RETURN c
  `,
  deleteClaim: `
    MATCH (c:ProgressClaim {projectId: $projectId, number: $number})
    WHERE COALESCE(c.isDeleted, false) = false
    SET c.isDeleted = true,
        c.updatedAt = datetime()
    RETURN c
  `,
};

// ----------------------------------------------------------------------------

/**
 * QUANTITY
 * Lot quantities linked to schedule items
 */
export interface QuantityNode {
  projectId: string;  // Foreign key to Project
  lotNumber: string;
  scheduleItemNumber: string;
  quantity: number;
  unit: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const QuantityMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry or calculation' },
  ],
  displayedOn: [
    '/projects/[projectId]/lots/[lotId]',
    '/projects/[projectId]/commercial/quantities',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Quantity belongs to project' },
      { type: 'FOR_LOT', target: 'Lot', description: 'Quantity for specific lot' },
      { type: 'FOR_SCHEDULE_ITEM', target: 'ScheduleItem', description: 'Quantity for schedule item' },
    ],
    incoming: [
      { type: 'HAS_QUANTITY', source: 'Lot', description: 'Lot has this quantity' },
    ],
  },
};

export const QuantitySchema = z.object({
  projectId: z.string(),
  lotNumber: z.string(),
  scheduleItemNumber: z.string(),
  quantity: z.number(),
  unit: z.string(),
});

export const QUANTITY_QUERIES = {
  getByLot: `
    MATCH (q:Quantity {projectId: $projectId, lotNumber: $lotNumber})
    RETURN q
  `,
};

// ----------------------------------------------------------------------------

/**
 * SAMPLE
 * Physical samples for testing
 */
export interface SampleNode {
  projectId: string;  // Foreign key to Project
  number: string;
  type: string;
  lotNumber: string;
  location: string;
  dateTaken: Date;
  takenBy: string;
  labName?: string;
  status: 'collected' | 'in_transit' | 'at_lab' | 'tested' | 'disposed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const SampleMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry during sampling' },
  ],
  displayedOn: [
    '/projects/[projectId]/testing/samples',
    '/projects/[projectId]/lots/[lotId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Sample belongs to project' },
      { type: 'FROM_LOT', target: 'Lot', description: 'Sample taken from lot' },
      { type: 'TAKEN_BY', target: 'User', description: 'Sample taken by user' },
      { type: 'SENT_TO_LAB', target: 'Laboratory', description: 'Sample sent to lab' },
    ],
    incoming: [
      { type: 'USES_SAMPLE', source: 'TestRequest', description: 'Test requests use this sample' },
    ],
  },
};

export const SampleSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  type: z.string(),
  lotNumber: z.string(),
  location: z.string(),
  dateTaken: z.coerce.date(),
  takenBy: z.string(),
  labName: z.string().optional(),
  status: z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']),
  notes: z.string().optional(),
});

export const CreateSampleInputSchema = z.object({
  number: z.string().optional(),
  type: z.string(),
  lotNumber: z.string(),
  location: z.string(),
  dateTaken: z.coerce.date().optional(),
  takenBy: z.string(),
  labName: z.string().optional(),
  status: z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']).default('collected'),
  notes: z.string().optional(),
});

export type CreateSampleInput = z.infer<typeof CreateSampleInputSchema>;

export const UpdateSampleInputSchema = z.object({
  type: z.string().optional(),
  lotNumber: z.string().optional(),
  location: z.string().optional(),
  dateTaken: z.coerce.date().optional(),
  takenBy: z.string().optional(),
  labName: z.string().optional(),
  status: z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']).optional(),
  notes: z.string().optional(),
});

export type UpdateSampleInput = z.infer<typeof UpdateSampleInputSchema>;

export const SAMPLE_QUERIES = {
  getAllSamples: `
    MATCH (s:Sample {projectId: $projectId})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
    ORDER BY s.dateTaken DESC
  `,
  getSamplesByLot: `
    MATCH (s:Sample {projectId: $projectId, lotNumber: $lotNumber})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
    ORDER BY s.dateTaken DESC
  `,
  getSampleByNumber: `
    MATCH (s:Sample {projectId: $projectId, number: $number})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
  `,
  createSample: `
    MATCH (p:Project {projectId: $projectId})
    OPTIONAL MATCH (l:Lot {projectId: $projectId, number: coalesce($lotNumber, $properties.lotNumber)})
    CREATE (s:Sample {
      projectId: $projectId,
      number: coalesce($properties.number, toString(randomUUID())),
      type: $properties.type,
      lotNumber: coalesce($properties.lotNumber, $lotNumber),
      location: $properties.location,
      dateTaken: CASE
        WHEN $properties.dateTaken IS NULL THEN datetime()
        ELSE datetime($properties.dateTaken)
      END,
      takenBy: $properties.takenBy,
      labName: $properties.labName,
      status: coalesce($properties.status, 'collected'),
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (s)-[:BELONGS_TO_PROJECT]->(p)
    FOREACH (_ IN CASE WHEN l IS NULL THEN [] ELSE [1] END |
      MERGE (s)-[:FROM_LOT]->(l)
    )
    RETURN s
  `,
  updateSample: `
    MATCH (s:Sample {projectId: $projectId, number: $number})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s += $properties,
        s.updatedAt = datetime()
    RETURN s
  `,
  deleteSample: `
    MATCH (s:Sample {projectId: $projectId, number: $number})
    SET s.isDeleted = true,
        s.updatedAt = datetime()
    RETURN s
  `,
};

// ----------------------------------------------------------------------------

/**
 * STANDARD
 * Industry standards and specifications
 */
export interface StandardNode {
  projectId: string;  // Foreign key to Project
  code: string;
  title: string;
  version?: string;
  authority?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const StandardMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'pqp-generation', prompt: '@prompts/pqp-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/standards',
    '/projects/[projectId]/quality/itps',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Standard belongs to project' },
    ],
    incoming: [
      { type: 'REFERENCES_STANDARD', source: 'ITPTemplate', description: 'ITP templates reference this standard' },
      { type: 'REFERENCES_STANDARD', source: 'InspectionPoint', description: 'Inspection points reference this standard' },
      { type: 'REFERENCES_STANDARD', source: 'WBSNode', description: 'WBS nodes reference this standard' },
    ],
  },
};

export const StandardSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  title: z.string(),
  version: z.string().optional(),
  authority: z.string().optional(),
  url: z.string().optional(),
});

export const CreateStandardInputSchema = z.object({
  code: z.string(),
  title: z.string(),
  version: z.string().optional(),
  authority: z.string().optional(),
  url: z.string().optional(),
});

export type CreateStandardInput = z.infer<typeof CreateStandardInputSchema>;

export const UpdateStandardInputSchema = z.object({
  title: z.string().optional(),
  version: z.string().optional(),
  authority: z.string().optional(),
  url: z.string().optional(),
});

export type UpdateStandardInput = z.infer<typeof UpdateStandardInputSchema>;

export const STANDARD_QUERIES = {
  getAllStandards: `
    MATCH (s:Standard {projectId: $projectId})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
    ORDER BY s.code
  `,
  getStandardByCode: `
    MATCH (s:Standard {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
  `,
  createStandard: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (s:Standard {
      projectId: $projectId,
      code: $properties.code,
      title: $properties.title,
      version: $properties.version,
      authority: $properties.authority,
      url: $properties.url,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (s)-[:BELONGS_TO_PROJECT]->(p)
    RETURN s
  `,
  updateStandard: `
    MATCH (s:Standard {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s.title = COALESCE($properties.title, s.title),
        s.version = COALESCE($properties.version, s.version),
        s.authority = COALESCE($properties.authority, s.authority),
        s.url = COALESCE($properties.url, s.url),
        s.updatedAt = datetime()
    RETURN s
  `,
  deleteStandard: `
    MATCH (s:Standard {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s.isDeleted = true,
        s.updatedAt = datetime()
    RETURN s
  `,
};

// ----------------------------------------------------------------------------

/**
 * SUPPLIER
 * Material and equipment suppliers
 */
export interface SupplierNode {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  abn?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  supplierType?: 'material' | 'equipment' | 'service';
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const SupplierMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/settings',
    '/projects/[projectId]/materials',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Supplier belongs to project' },
    ],
    incoming: [
      { type: 'SUPPLIED_BY', source: 'Material', description: 'Materials supplied by this supplier' },
    ],
  },
};

export const SupplierSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  abn: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  supplierType: z.enum(['material', 'equipment', 'service']).optional(),
});

export const CreateSupplierInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  abn: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  supplierType: z.enum(['material', 'equipment', 'service']).optional(),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierInputSchema>;

export const UpdateSupplierInputSchema = z.object({
  name: z.string().optional(),
  abn: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  supplierType: z.enum(['material', 'equipment', 'service']).optional(),
});

export type UpdateSupplierInput = z.infer<typeof UpdateSupplierInputSchema>;

export const SUPPLIER_QUERIES = {
  getAllSuppliers: `
    MATCH (s:Supplier {projectId: $projectId})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
    ORDER BY s.name
  `,
  getSupplierByCode: `
    MATCH (s:Supplier {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    RETURN s
  `,
  createSupplier: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (s:Supplier {
      projectId: $projectId,
      code: $properties.code,
      name: $properties.name,
      abn: $properties.abn,
      contactEmail: $properties.contactEmail,
      contactPhone: $properties.contactPhone,
      address: $properties.address,
      supplierType: $properties.supplierType,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (s)-[:BELONGS_TO_PROJECT]->(p)
    RETURN s
  `,
  updateSupplier: `
    MATCH (s:Supplier {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s += $properties,
        s.updatedAt = datetime()
    RETURN s
  `,
  deleteSupplier: `
    MATCH (s:Supplier {projectId: $projectId, code: $code})
    WHERE COALESCE(s.isDeleted, false) = false
    SET s.isDeleted = true,
        s.updatedAt = datetime()
    RETURN s
  `,
};

// ----------------------------------------------------------------------------

/**
 * TEST REQUEST
 * Laboratory test requests
 */
export interface TestRequestNode {
  projectId: string;  // Foreign key to Project
  number: string;
  testType: string;
  status: 'requested' | 'in_progress' | 'completed' | 'approved' | 'failed';
  requestedDate: Date;
  requestedBy: string;
  dueDate?: Date;
  completedDate?: Date;
  lotNumber?: string;
  materialCode?: string;
  sampleNumber?: string;
  testMethodCode?: string;
  labName?: string;
  results?: Record<string, any>;
  passed?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const TestRequestMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry or triggered by inspection' },
  ],
  displayedOn: [
    '/projects/[projectId]/testing/requests',
    '/projects/[projectId]/lots/[lotId]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Test request belongs to project' },
      { type: 'FOR_LOT', target: 'Lot', description: 'Test for specific lot' },
      { type: 'TESTS_MATERIAL', target: 'Material', description: 'Tests specific material' },
      { type: 'USES_SAMPLE', target: 'Sample', description: 'Uses specific sample' },
      { type: 'FOLLOWS_METHOD', target: 'TestMethod', description: 'Follows test method' },
      { type: 'REQUESTED_BY', target: 'User', description: 'Requested by user' },
    ],
    incoming: [
      { type: 'HAS_TEST', source: 'Lot', description: 'Lot has this test request' },
    ],
  },
};

export const TestRequestSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  testType: z.string(),
  status: z.enum(['requested', 'in_progress', 'completed', 'approved', 'failed']),
  requestedDate: z.coerce.date(),
  requestedBy: z.string(),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  lotNumber: z.string().optional(),
  materialCode: z.string().optional(),
  sampleNumber: z.string().optional(),
  testMethodCode: z.string().optional(),
  labName: z.string().optional(),
  passed: z.boolean().optional(),
  notes: z.string().optional(),
  results: z.record(z.any()).optional(),
});

export const CreateTestRequestInputSchema = z.object({
  number: z.string().optional(),
  testType: z.string(),
  status: z.enum(['requested', 'in_progress', 'completed', 'approved', 'failed']).default('requested'),
  requestedDate: z.coerce.date().optional(),
  requestedBy: z.string(),
  dueDate: z.coerce.date().optional(),
  lotNumber: z.string().optional(),
  materialCode: z.string().optional(),
  sampleNumber: z.string().optional(),
  testMethodCode: z.string().optional(),
  labName: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateTestRequestInput = z.infer<typeof CreateTestRequestInputSchema>;

export const UpdateTestRequestInputSchema = z.object({
  testType: z.string().optional(),
  status: z.enum(['requested', 'in_progress', 'completed', 'approved', 'failed']).optional(),
  requestedDate: z.coerce.date().optional(),
  requestedBy: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  lotNumber: z.string().optional(),
  materialCode: z.string().optional(),
  sampleNumber: z.string().optional(),
  testMethodCode: z.string().optional(),
  labName: z.string().optional(),
  passed: z.boolean().optional(),
  notes: z.string().optional(),
  results: z.record(z.any()).optional(),
});

export type UpdateTestRequestInput = z.infer<typeof UpdateTestRequestInputSchema>;

export const TEST_REQUEST_QUERIES = {
  getAllTests: `
    MATCH (t:TestRequest {projectId: $projectId})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.requestedDate DESC
  `,
  getPendingTests: `
    MATCH (t:TestRequest {projectId: $projectId, status: 'requested'})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.requestedDate DESC
  `,
  getTestByNumber: `
    MATCH (t:TestRequest {projectId: $projectId, number: $number})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
  `,
  createTest: `
    MATCH (p:Project {projectId: $projectId})
    OPTIONAL MATCH (l:Lot {projectId: $projectId, number: coalesce($properties.lotNumber, $lotNumber)})
    CREATE (t:TestRequest {
      projectId: $projectId,
      number: coalesce($properties.number, toString(randomUUID())),
      testType: $properties.testType,
      status: coalesce($properties.status, 'requested'),
      requestedDate: CASE
        WHEN $properties.requestedDate IS NULL THEN datetime()
        ELSE datetime($properties.requestedDate)
      END,
      requestedBy: $properties.requestedBy,
      dueDate: CASE
        WHEN $properties.dueDate IS NULL THEN null
        ELSE datetime($properties.dueDate)
      END,
      completedDate: CASE
        WHEN $properties.completedDate IS NULL THEN null
        ELSE datetime($properties.completedDate)
      END,
      lotNumber: coalesce($properties.lotNumber, $lotNumber),
      materialCode: $properties.materialCode,
      sampleNumber: $properties.sampleNumber,
      testMethodCode: $properties.testMethodCode,
      labName: $properties.labName,
      results: coalesce($properties.results, {}),
      passed: $properties.passed,
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (t)-[:BELONGS_TO_PROJECT]->(p)
    FOREACH (_ IN CASE WHEN l IS NULL THEN [] ELSE [1] END |
      MERGE (t)-[:FOR_LOT]->(l)
    )
    RETURN t
  `,
  updateTest: `
    MATCH (t:TestRequest {projectId: $projectId, number: $number})
    WHERE COALESCE(t.isDeleted, false) = false
    SET t += $properties,
        t.updatedAt = datetime()
    RETURN t
  `,
  deleteTest: `
    MATCH (t:TestRequest {projectId: $projectId, number: $number})
    SET t.isDeleted = true,
        t.updatedAt = datetime()
    RETURN t
  `,
};

// ----------------------------------------------------------------------------

/**
 * TEST METHOD
 * Standardized test methods
 */
export interface TestMethodNode {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  standard: string;
  procedure: string;
  acceptanceCriteria?: string;
  frequency?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const TestMethodMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry or import' },
  ],
  displayedOn: [
    '/projects/[projectId]/testing/methods',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Method belongs to project' },
    ],
    incoming: [
      { type: 'USES_TEST_METHOD', source: 'InspectionPoint', description: 'Inspection points use this method' },
      { type: 'FOLLOWS_METHOD', source: 'TestRequest', description: 'Test requests follow this method' },
    ],
  },
};

export const TestMethodSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  standard: z.string(),
  procedure: z.string(),
  acceptanceCriteria: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateTestMethodInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  standard: z.string(),
  procedure: z.string(),
  acceptanceCriteria: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateTestMethodInput = z.infer<typeof CreateTestMethodInputSchema>;

export const UpdateTestMethodInputSchema = z.object({
  name: z.string().optional(),
  standard: z.string().optional(),
  procedure: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateTestMethodInput = z.infer<typeof UpdateTestMethodInputSchema>;

export const TEST_METHOD_QUERIES = {
  getAllMethods: `
    MATCH (t:TestMethod {projectId: $projectId})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
    ORDER BY t.code
  `,
  getMethodByCode: `
    MATCH (t:TestMethod {projectId: $projectId, code: $code})
    WHERE COALESCE(t.isDeleted, false) = false
    RETURN t
  `,
  createMethod: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (t:TestMethod {
      projectId: $projectId,
      code: $properties.code,
      name: $properties.name,
      standard: $properties.standard,
      procedure: $properties.procedure,
      acceptanceCriteria: $properties.acceptanceCriteria,
      frequency: $properties.frequency,
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (t)-[:BELONGS_TO_PROJECT]->(p)
    RETURN t
  `,
  updateMethod: `
    MATCH (t:TestMethod {projectId: $projectId, code: $code})
    WHERE COALESCE(t.isDeleted, false) = false
    SET t += $properties,
        t.updatedAt = datetime()
    RETURN t
  `,
  deleteMethod: `
    MATCH (t:TestMethod {projectId: $projectId, code: $code})
    SET t.isDeleted = true,
        t.updatedAt = datetime()
    RETURN t
  `,
};

// ----------------------------------------------------------------------------

/**
 * USER
 * System users (synced from auth)
 */
export interface UserNode {
  email: string;
  userId: string;
  name: string;
  role: string;
  organizationId: string;
  projectIds?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const UserMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'SYNC', prompt: 'Synced from Postgres auth.users' },
  ],
  displayedOn: [
    '/projects/[projectId]/team',
    '/settings/users',
  ],
  relationships: {
    outgoing: [],
    incoming: [
      { type: 'APPROVED_BY', source: 'ITPTemplate', description: 'User approves ITP templates' },
      { type: 'APPROVED_BY', source: 'ManagementPlan', description: 'User approves management plans' },
      { type: 'TAKEN_BY', source: 'Photo', description: 'User takes photos' },
      { type: 'TAKEN_BY', source: 'Sample', description: 'User takes samples' },
      { type: 'REPORTED_BY', source: 'NCR', description: 'User reports NCRs' },
      { type: 'RESOLVED_BY', source: 'NCR', description: 'User resolves NCRs' },
      { type: 'REQUESTED_BY', source: 'TestRequest', description: 'User requests tests' },
    ],
  },
};

export const UserSchema = z.object({
  email: z.string().email(),
  userId: z.string(),
  name: z.string(),
  role: z.string(),
  organizationId: z.string(),
});

export const USER_QUERIES = {
  getAll: `
    MATCH (u:User)
    RETURN u
    ORDER BY u.name
  `,
  getByEmail: `
    MATCH (u:User {email: $email})
    RETURN u
  `,
};

// ----------------------------------------------------------------------------

/**
 * VARIATION
 * Contract variations
 */
export interface VariationNode {
  projectId: string;  // Foreign key to Project
  number: string;
  description: string;
  status: 'identified' | 'notified' | 'under_review' | 'quoted' | 'approved' | 'rejected' | 'implemented';
  claimedValue: number;
  approvedValue?: number;
  dateIdentified: Date;
  dateNotified?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const VariationMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'MANUAL', prompt: 'Manual entry by contract admin' },
  ],
  displayedOn: [
    '/projects/[projectId]/commercial/variations',
    '/projects/[projectId]/commercial/variations/[number]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Variation belongs to project' },
      { type: 'AFFECTS_SCHEDULE_ITEM', target: 'ScheduleItem', description: 'Variation affects schedule items' },
    ],
    incoming: [],
  },
};

export const VariationSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  description: z.string(),
  status: z.enum(['identified', 'notified', 'under_review', 'quoted', 'approved', 'rejected', 'implemented']),
  claimedValue: z.number(),
  approvedValue: z.number().optional(),
  dateIdentified: z.coerce.date(),
  dateNotified: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const CreateVariationInputSchema = z.object({
  description: z.string(),
  claimedValue: z.number(),
  dateIdentified: z.coerce.date(),
  status: z.enum(['identified', 'notified', 'under_review', 'quoted', 'approved', 'rejected', 'implemented']).default('identified'),
  dateNotified: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateVariationInput = z.infer<typeof CreateVariationInputSchema>;

export const UpdateVariationInputSchema = z.object({
  description: z.string().optional(),
  claimedValue: z.number().optional(),
  approvedValue: z.number().optional(),
  status: z.enum(['identified', 'notified', 'under_review', 'quoted', 'approved', 'rejected', 'implemented']).optional(),
  dateIdentified: z.coerce.date().optional(),
  dateNotified: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type UpdateVariationInput = z.infer<typeof UpdateVariationInputSchema>;

export const VARIATION_QUERIES = {
  getAllVariations: `
    MATCH (v:Variation {projectId: $projectId})
    WHERE COALESCE(v.isDeleted, false) = false
    RETURN v
    ORDER BY v.dateIdentified DESC
  `,
  getVariationByNumber: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    WHERE COALESCE(v.isDeleted, false) = false
    RETURN v
  `,
  createVariation: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (v:Variation {
      projectId: $projectId,
      number: coalesce($properties.number, toString(randomUUID())),
      description: $properties.description,
      status: coalesce($properties.status, 'identified'),
      claimedValue: toFloat($properties.claimedValue),
      approvedValue: coalesce(toFloat($properties.approvedValue), 0),
      dateIdentified: datetime($properties.dateIdentified),
      dateNotified: CASE
        WHEN $properties.dateNotified IS NULL THEN null
        ELSE datetime($properties.dateNotified)
      END,
      notes: $properties.notes,
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (v)-[:BELONGS_TO_PROJECT]->(p)
    RETURN v
  `,
  updateVariation: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    WHERE COALESCE(v.isDeleted, false) = false
    SET v += {
          description: COALESCE($properties.description, v.description),
          status: COALESCE($properties.status, v.status),
          claimedValue: COALESCE(toFloat($properties.claimedValue), v.claimedValue),
          approvedValue: COALESCE(toFloat($properties.approvedValue), v.approvedValue),
          approvedBy: COALESCE($properties.approvedBy, v.approvedBy),
          notes: COALESCE($properties.notes, v.notes)
        },
        v.dateIdentified = CASE
          WHEN $properties.dateIdentified IS NULL THEN v.dateIdentified
          ELSE datetime($properties.dateIdentified)
        END,
        v.dateNotified = CASE
          WHEN $properties.dateNotified IS NULL THEN v.dateNotified
          ELSE datetime($properties.dateNotified)
        END,
        v.approvedDate = CASE
          WHEN $properties.approvedDate IS NULL THEN v.approvedDate
          ELSE datetime($properties.approvedDate)
        END,
        v.updatedAt = datetime()
    RETURN v
  `,
  deleteVariation: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    WHERE COALESCE(v.isDeleted, false) = false
    SET v.isDeleted = true,
        v.updatedAt = datetime()
    RETURN v
  `,
};

// ----------------------------------------------------------------------------

/**
 * WBS NODE
 * Work Breakdown Structure node
 */
export interface WBSNodeType {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  level: number;
  parentCode?: string;
  description?: string;
  deliverableType?: 'project' | 'major_component' | 'sub_deliverable' | 'work_package';
  category?: 'earthworks' | 'drainage' | 'pavements' | 'structures' | 'services' | 'landscaping' | 'other';
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const WBSNodeMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'wbs-extraction', prompt: '@prompts/wbs-extraction.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/structure/wbs',
    '/projects/[projectId]/structure/wbs/[code]',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'WBS belongs to project' },
      { type: 'PARENT_OF', target: 'WBSNode', description: 'Parent-child hierarchy' },
      { type: 'REQUIRES_ITP', target: 'ITPTemplate', description: 'Work requires ITP templates' },
      { type: 'REFERENCES_DOCUMENT', target: 'Document', description: 'References specs/drawings' },
      { type: 'REFERENCES_STANDARD', target: 'Standard', description: 'References standards' },
    ],
    incoming: [
      { type: 'CHILD_OF', source: 'WBSNode', description: 'Child nodes' },
      { type: 'COVERS_WBS', source: 'Lot', description: 'Lots cover this work' },
      { type: 'LINKED_TO_WBS', source: 'LBSNode', description: 'Locations linked to this work' },
    ],
  },
};

export const WBSNodeSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  level: z.number(),
  parentCode: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
});

export const WBS_NODE_QUERIES = {
  getAll: `
    MATCH (w:WBSNode {projectId: $projectId})
    RETURN w
    ORDER BY w.code
  `,
  getByCode: `
    MATCH (w:WBSNode {projectId: $projectId, code: $code})
    RETURN w
  `,
};

// ----------------------------------------------------------------------------

/**
 * WORK TYPE
 * Reference data for work types
 */
export interface WorkTypeNode {
  projectId: string;  // Foreign key to Project
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const WorkTypeMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
    { agent: 'pqp-generation', prompt: '@prompts/pqp-generation.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/settings',
    '/projects/[projectId]/quality/itps',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Work type belongs to project' },
    ],
    incoming: [
      { type: 'USES_WORK_TYPE', source: 'Lot', description: 'Lots use this work type' },
      { type: 'USES_WORK_TYPE', source: 'ITPTemplate', description: 'ITP templates for this work type' },
      { type: 'CATEGORIZED_AS', source: 'ScheduleItem', description: 'Schedule items categorized by work type' },
    ],
  },
};

export const WorkTypeSchema = z.object({
  projectId: z.string(),
  code: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const CreateWorkTypeInputSchema = z.object({
  code: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type CreateWorkTypeInput = z.infer<typeof CreateWorkTypeInputSchema>;

export const UpdateWorkTypeInputSchema = z.object({
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateWorkTypeInput = z.infer<typeof UpdateWorkTypeInputSchema>;

export const WORK_TYPE_QUERIES = {
  getAllWorkTypes: `
    MATCH (w:WorkType {projectId: $projectId})
    WHERE COALESCE(w.isDeleted, false) = false
    RETURN w
    ORDER BY w.code
  `,
  getWorkTypeByCode: `
    MATCH (w:WorkType {projectId: $projectId, code: $code})
    WHERE COALESCE(w.isDeleted, false) = false
    RETURN w
  `,
  createWorkType: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (w:WorkType {
      projectId: $projectId,
      code: $properties.code,
      description: $properties.description,
      metadata: COALESCE($properties.metadata, {}),
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (w)-[:BELONGS_TO_PROJECT]->(p)
    RETURN w
  `,
  updateWorkType: `
    MATCH (w:WorkType {projectId: $projectId, code: $code})
    WHERE COALESCE(w.isDeleted, false) = false
    SET w.description = COALESCE($properties.description, w.description),
        w.metadata = COALESCE($properties.metadata, w.metadata),
        w.updatedAt = datetime()
    RETURN w
  `,
  deleteWorkType: `
    MATCH (w:WorkType {projectId: $projectId, code: $code})
    WHERE COALESCE(w.isDeleted, false) = false
    SET w.isDeleted = true,
        w.updatedAt = datetime()
    RETURN w
  `,
};

// ----------------------------------------------------------------------------

/**
 * PARTY
 * Key project parties and contacts
 */
export interface PartyNode {
  projectId: string;  // Foreign key to Project
  code: string;
  name: string;
  role: string;
  organization: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  abn?: string;
  additionalDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  id?: string;
}

export const PartyMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'project-details', prompt: '@prompts/project-details.md' },
  ],
  displayedOn: [
    '/projects/[projectId]/settings',
    '/projects/[projectId]/team',
  ],
  relationships: {
    outgoing: [
      { type: 'BELONGS_TO_PROJECT', target: 'Project', description: 'Party belongs to project' },
    ],
    incoming: [],
  },
};

export const PartySchema = z.object({
  projectId: z.string(),
  code: z.string(),
  name: z.string(),
  role: z.string(),
  organization: z.string(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  abn: z.string().optional(),
  additionalDetails: z.record(z.any()).optional(),
});

export const CreatePartyInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  role: z.string(),
  organization: z.string(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  abn: z.string().optional(),
  additionalDetails: z.record(z.any()).optional(),
});

export type CreatePartyInput = z.infer<typeof CreatePartyInputSchema>;

export const UpdatePartyInputSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  organization: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  abn: z.string().optional(),
  additionalDetails: z.record(z.any()).optional(),
});

export type UpdatePartyInput = z.infer<typeof UpdatePartyInputSchema>;

export const PARTY_QUERIES = {
  getAllParties: `
    MATCH (party:Party {projectId: $projectId})
    WHERE COALESCE(party.isDeleted, false) = false
    RETURN party
    ORDER BY party.name
  `,
  getPartyByCode: `
    MATCH (party:Party {projectId: $projectId, code: $code})
    WHERE COALESCE(party.isDeleted, false) = false
    RETURN party
  `,
  createParty: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (party:Party {
      projectId: $projectId,
      code: $properties.code,
      name: $properties.name,
      role: $properties.role,
      organization: $properties.organization,
      contactPerson: $properties.contactPerson,
      email: $properties.email,
      phone: $properties.phone,
      address: $properties.address,
      abn: $properties.abn,
      additionalDetails: COALESCE($properties.additionalDetails, {}),
      createdAt: datetime(),
      updatedAt: datetime(),
      isDeleted: false
    })
    MERGE (party)-[:BELONGS_TO_PROJECT]->(p)
    RETURN party
  `,
  updateParty: `
    MATCH (party:Party {projectId: $projectId, code: $code})
    WHERE COALESCE(party.isDeleted, false) = false
    SET party += $properties,
        party.updatedAt = datetime()
    RETURN party
  `,
  deleteParty: `
    MATCH (party:Party {projectId: $projectId, code: $code})
    WHERE COALESCE(party.isDeleted, false) = false
    SET party.isDeleted = true,
        party.updatedAt = datetime()
    RETURN party
  `,
};

// ============================================================================
// MASTER OUTPUT
// ============================================================================

export interface MasterProjectOutput {
  project?: ProjectNode;
  documents?: DocumentNode[];
  standards?: StandardNode[];
  workTypes?: WorkTypeNode[];
  areaCodes?: AreaCodeNode[];
  suppliers?: SupplierNode[];
  laboratories?: LaboratoryNode[];
  users?: UserNode[];
  parties?: PartyNode[];
  itpTemplates?: Array<{
    template: ITPTemplateNode;
    inspectionPoints: InspectionPointNode[];
    relationships: {
      usesWorkType: string;
      referencesStandards: string[];
      referencesDocuments: string[];
    };
  }>;
  wbsNodes?: Array<{
    node: WBSNodeType;
    relationships: {
      parentCode?: string;
      requiresITPs: string[];
      referencesDocuments: string[];
    };
  }>;
  lbsNodes?: Array<{
    node: LBSNodeType;
    relationships: {
      parentCode?: string;
      linkedToWBS: string[];
      referencesDocuments: string[];
    };
  }>;
  scheduleItems?: Array<{
    item: ScheduleItemNode;
    relationships: {
      usesWorkType?: string;
    };
  }>;
  managementPlans?: ManagementPlanNode[];
  materials?: MaterialNode[];
  mixDesigns?: MixDesignNode[];
  testMethods?: TestMethodNode[];
  // Lots and instances created by scripts, not agents
  lots?: LotNode[];
  itpInstances?: ITPInstanceNode[];
  ncrs?: NCRNode[];
  samples?: SampleNode[];
  testRequests?: TestRequestNode[];
  photos?: PhotoNode[];
  quantities?: QuantityNode[];
  progressClaims?: ProgressClaimNode[];
  variations?: VariationNode[];
}

// ============================================================================
// HELPERS
// ============================================================================

export const ALL_ENTITIES = [
  'AreaCode',
  'Document',
  'InspectionPoint',
  'ITPInstance',
  'ITPTemplate',
  'Laboratory',
  'LBSNode',
  'Lot',
  'ManagementPlan',
  'Material',
  'MixDesign',
  'NCR',
  'Party',
  'Photo',
  'ProgressClaim',
  'Project',
  'Quantity',
  'Sample',
  'ScheduleItem',
  'Standard',
  'Supplier',
  'TestMethod',
  'TestRequest',
  'User',
  'Variation',
  'WBSNode',
  'WorkType',
] as const;

export type EntityType = typeof ALL_ENTITIES[number];

export function getEntityMetadata(entityType: EntityType): EntityMetadata {
  const metadataMap: Record<EntityType, EntityMetadata> = {
    AreaCode: AreaCodeMetadata,
    Document: DocumentMetadata,
    InspectionPoint: InspectionPointMetadata,
    ITPInstance: ITPInstanceMetadata,
    ITPTemplate: ITPTemplateMetadata,
    Laboratory: LaboratoryMetadata,
    LBSNode: LBSNodeMetadata,
    Lot: LotMetadata,
    ManagementPlan: ManagementPlanMetadata,
    Material: MaterialMetadata,
    MixDesign: MixDesignMetadata,
    NCR: NCRMetadata,
    Party: PartyMetadata,
    Photo: PhotoMetadata,
    ProgressClaim: ProgressClaimMetadata,
    Project: ProjectMetadata,
    Quantity: QuantityMetadata,
    Sample: SampleMetadata,
    ScheduleItem: ScheduleItemMetadata,
    Standard: StandardMetadata,
    Supplier: SupplierMetadata,
    TestMethod: TestMethodMetadata,
    TestRequest: TestRequestMetadata,
    User: UserMetadata,
    Variation: VariationMetadata,
    WBSNode: WBSNodeMetadata,
    WorkType: WorkTypeMetadata,
  };
  
  return metadataMap[entityType];
}

export function getEntitySchema(entityType: EntityType): z.ZodSchema {
  const schemaMap: Record<EntityType, z.ZodSchema> = {
    AreaCode: AreaCodeSchema,
    Document: DocumentSchema,
    InspectionPoint: InspectionPointSchema,
    ITPInstance: ITPInstanceSchema,
    ITPTemplate: ITPTemplateSchema,
    Laboratory: LaboratorySchema,
    LBSNode: LBSNodeSchema,
    Lot: LotSchema,
    ManagementPlan: ManagementPlanSchema,
    Material: MaterialSchema,
    MixDesign: MixDesignSchema,
    NCR: NCRSchema,
    Party: PartySchema,
    Photo: PhotoSchema,
    ProgressClaim: ProgressClaimSchema,
    Project: ProjectSchema,
    Quantity: QuantitySchema,
    Sample: SampleSchema,
    ScheduleItem: ScheduleItemSchema,
    Standard: StandardSchema,
    Supplier: SupplierSchema,
    TestMethod: TestMethodSchema,
    TestRequest: TestRequestSchema,
    User: UserSchema,
    Variation: VariationSchema,
    WBSNode: WBSNodeSchema,
    WorkType: WorkTypeSchema,
  };
  
  return schemaMap[entityType];
}

export function getEntitiesByAgent(agentName: string): EntityType[] {
  return ALL_ENTITIES.filter(entity => {
    const metadata = getEntityMetadata(entity);
    return metadata.createdBy.some(creator => creator.agent === agentName);
  });
}

export function getEntitiesByPage(pagePath: string): EntityType[] {
  return ALL_ENTITIES.filter(entity => {
    const metadata = getEntityMetadata(entity);
    return metadata.displayedOn.some(page => page === pagePath);
  });
}