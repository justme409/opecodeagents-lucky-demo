import { z } from 'zod';

/**
 * ============================================================================
 * MASTER PROJECT SCHEMA - OPTION 3: FLAT STRUCTURE
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

// ============================================================================
// ALL ENTITIES (Alphabetical)
// ============================================================================

/**
 * AREA CODE
 * Reference data for construction area codes
 */
export interface AreaCodeNode {
  projectId: string;
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
});

// ----------------------------------------------------------------------------

/**
 * DOCUMENT
 * Document and drawing register with revisions
 */
export interface DocumentNode {
  projectId: string;
  documentNumber: string;
  revisionCode: string;
  docKind: 'drawing' | 'document';
  title?: string;
  type?: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'other';
  discipline?: 'civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'other';
  status: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived';
  issueDate?: Date;
  fileUrl?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
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
  title: z.string().optional(),
  type: z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'other']).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']),
  fileUrl: z.string().optional(),
});

// ----------------------------------------------------------------------------

/**
 * INSPECTION POINT
 * Individual inspection/test points within ITPs
 */
export interface InspectionPointNode {
  projectId: string;
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

// ----------------------------------------------------------------------------

/**
 * ITP INSTANCE
 * Lot-specific instance of an ITP template
 */
export interface ITPInstanceNode {
  projectId: string;
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
});

// ----------------------------------------------------------------------------

/**
 * ITP TEMPLATE
 * Global, reusable ITP template
 */
export interface ITPTemplateNode {
  projectId: string;
  docNo: string;
  description: string;
  workType: string;
  specRef: string;
  jurisdiction?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
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
  status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
  approvalStatus: z.enum(['not_required', 'pending', 'approved', 'rejected']),
  revisionDate: z.coerce.date(),
  revisionNumber: z.string(),
});

// ----------------------------------------------------------------------------

/**
 * LABORATORY
 * Testing laboratory details
 */
export interface LaboratoryNode {
  projectId: string;
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

// ----------------------------------------------------------------------------

/**
 * LBS NODE
 * Location Breakdown Structure node
 */
export interface LBSNodeType {
  projectId: string;
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

// ----------------------------------------------------------------------------

/**
 * LOT
 * Discrete work package for quality tracking
 */
export interface LotNode {
  projectId: string;
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

export const LotSchema = z.object({
  projectId: z.string(),
  number: z.string(),
  status: z.enum(['open', 'in_progress', 'conformed', 'closed']),
  percentComplete: z.number(),
  description: z.string(),
  workType: z.string(),
  areaCode: z.string(),
  startChainage: z.number(),
  endChainage: z.number(),
  startDate: z.coerce.date(),
});

// ----------------------------------------------------------------------------

/**
 * MANAGEMENT PLAN
 * Project management plans (PQP, OHSMP, EMP, etc.)
 */
export interface ManagementPlanNode {
  projectId: string;
  type: 'PQP' | 'OHSMP' | 'EMP' | 'CEMP' | 'TMP';
  title: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvedBy?: string;
  approvedDate?: Date;
  content?: string;
  htmlContent?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
  htmlContent: z.string().optional(),
});

// ----------------------------------------------------------------------------

/**
 * MATERIAL
 * Construction materials with approvals
 */
export interface MaterialNode {
  projectId: string;
  code: string;
  name: string;
  type: string;
  supplier: string;
  specification: string;
  batchNumber?: string;
  certificateId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  approvalStatus: z.enum(['pending', 'approved', 'rejected']),
});

// ----------------------------------------------------------------------------

/**
 * MIX DESIGN
 * Concrete or material mix designs
 */
export interface MixDesignNode {
  projectId: string;
  code: string;
  name: string;
  materialCode: string;
  strength?: string;
  slump?: string;
  components: Array<{
    material: string;
    quantity: number;
    unit: string;
  }>;
  status: 'draft' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  name: z.string(),
  materialCode: z.string(),
  components: z.array(z.object({
    material: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })),
  status: z.enum(['draft', 'approved', 'rejected']),
});

// ----------------------------------------------------------------------------

/**
 * NCR (Non-Conformance Report)
 * Quality issues and defects
 */
export interface NCRNode {
  projectId: string;
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
});

// ----------------------------------------------------------------------------

/**
 * PROJECT
 * Root project node
 */
export interface ProjectNode {
  projectId: string;
  name: string;
  code?: string;
  contractNumber?: string;
  description?: string;
  scopeSummary?: string;
  address?: string;
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
    ],
  },
};

export const ProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  code: z.string().optional(),
  contractNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
});

// ----------------------------------------------------------------------------

/**
 * SCHEDULE ITEM
 * Bill of Quantities item
 */
export interface ScheduleItemNode {
  projectId: string;
  number: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  category?: string;
  workType?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  workType: z.string().optional(),
});

// ----------------------------------------------------------------------------

/**
 * PHOTO
 * Site photos and progress images
 */
export interface PhotoNode {
  projectId: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  caption?: string;
  location?: string;
  takenBy?: string;
  takenDate?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
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
  fileUrl: z.string(),
  fileName: z.string().optional(),
  caption: z.string().optional(),
  takenDate: z.coerce.date().optional(),
});

// ----------------------------------------------------------------------------

/**
 * PROGRESS CLAIM
 * Progress payment claims
 */
export interface ProgressClaimNode {
  projectId: string;
  number: string;
  claimDate: Date;
  periodStart: Date;
  periodEnd: Date;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  totalAmount: number;
  claimItems: Array<{
    scheduleItemNumber: string;
    quantityClaimed: number;
    amountClaimed: number;
  }>;
  submittedBy?: string;
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  claimDate: z.coerce.date(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  status: z.enum(['draft', 'submitted', 'approved', 'paid']),
  totalAmount: z.number(),
  claimItems: z.array(z.object({
    scheduleItemNumber: z.string(),
    quantityClaimed: z.number(),
    amountClaimed: z.number(),
  })),
});

// ----------------------------------------------------------------------------

/**
 * QUANTITY
 * Lot quantities linked to schedule items
 */
export interface QuantityNode {
  projectId: string;
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

// ----------------------------------------------------------------------------

/**
 * SAMPLE
 * Physical samples for testing
 */
export interface SampleNode {
  projectId: string;
  number: string;
  type: string;
  lotNumber: string;
  location: string;
  dateTaken: Date;
  takenBy: string;
  labCode?: string;
  status: 'collected' | 'in_transit' | 'at_lab' | 'tested' | 'disposed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  status: z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']),
});

// ----------------------------------------------------------------------------

/**
 * STANDARD
 * Industry standards and specifications
 */
export interface StandardNode {
  projectId: string;
  code: string;
  title: string;
  version?: string;
  authority?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const StandardMetadata: EntityMetadata = {
  createdBy: [
    { agent: 'standards-extraction', prompt: '@prompts/standards-extraction.md' },
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
});

// ----------------------------------------------------------------------------

/**
 * SUPPLIER
 * Material and equipment suppliers
 */
export interface SupplierNode {
  projectId: string;
  code: string;
  name: string;
  abn?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  supplierType?: 'material' | 'equipment' | 'service';
  createdAt: Date;
  updatedAt: Date;
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
  contactEmail: z.string().optional(),
});

// ----------------------------------------------------------------------------

/**
 * TEST REQUEST
 * Laboratory test requests
 */
export interface TestRequestNode {
  projectId: string;
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
  results?: Record<string, any>;
  passed?: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
});

// ----------------------------------------------------------------------------

/**
 * TEST METHOD
 * Standardized test methods
 */
export interface TestMethodNode {
  projectId: string;
  code: string;
  name: string;
  standard: string;
  procedure: string;
  acceptanceCriteria?: string;
  frequency?: string;
  createdAt: Date;
  updatedAt: Date;
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
});

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

// ----------------------------------------------------------------------------

/**
 * VARIATION
 * Contract variations
 */
export interface VariationNode {
  projectId: string;
  number: string;
  description: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  amount: number;
  proposedDate: Date;
  approvedDate?: Date;
  approvedBy?: string;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
  status: z.enum(['proposed', 'approved', 'rejected', 'implemented']),
  amount: z.number(),
  proposedDate: z.coerce.date(),
});

// ----------------------------------------------------------------------------

/**
 * WBS NODE
 * Work Breakdown Structure node
 */
export interface WBSNodeType {
  projectId: string;
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

// ----------------------------------------------------------------------------

/**
 * WORK TYPE
 * Reference data for work types
 */
export interface WorkTypeNode {
  projectId: string;
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
});

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

