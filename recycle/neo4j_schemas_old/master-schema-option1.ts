import { z } from 'zod';

/**
 * ============================================================================
 * MASTER PROJECT SCHEMA - OPTION 1: AGENT-CENTRIC
 * ============================================================================
 * 
 * Organization: Grouped by which agent generates the content
 * 
 * Benefits:
 * - Clear agent boundaries
 * - Easy to see what each agent is responsible for
 * - Simple to extract agent-specific schemas
 * 
 * Structure:
 * - Each section = One agent's output
 * - Agent prompts reference their section
 * - Pages import from their relevant sections
 */

// ============================================================================
// CORE NODE DEFINITIONS (Shared across all agents)
// ============================================================================

// --- Project Root ---
export interface ProjectNode {
  projectId: string;
  name: string;
  code?: string;
  contractNumber?: string;
  description?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// --- Reference Data (Created first, used by all) ---
export interface WorkTypeNode {
  projectId: string;
  code: string;
  description: string;
}

export interface AreaCodeNode {
  projectId: string;
  code: string;
  description: string;
}

export interface StandardNode {
  projectId: string;
  code: string;
  title: string;
  version?: string;
  authority?: string;
}

export interface SupplierNode {
  projectId: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface LaboratoryNode {
  projectId: string;
  code: string;
  name: string;
  nataNumber?: string;
  contactEmail?: string;
}

// --- Documents ---
export interface DocumentNode {
  projectId: string;
  documentNumber: string;
  revisionCode: string;
  docKind: 'drawing' | 'document';
  title?: string;
  type?: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'other';
  status: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived';
  fileUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- ITP Templates (Global, reusable) ---
export interface ITPTemplateNode {
  projectId: string;
  docNo: string;
  description: string;
  workType: string;
  specRef: string;
  jurisdiction?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  applicableStandards?: string[];
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  revisionDate: Date;
  revisionNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  isHoldPoint: boolean;
  isWitnessPoint: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- WBS & LBS ---
export interface WBSNodeType {
  projectId: string;
  code: string;
  name: string;
  level: number;
  parentCode?: string;
  description?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LBSNodeType {
  projectId: string;
  code: string;
  name: string;
  type: 'site' | 'zone' | 'chainage' | 'layer' | 'element' | 'building' | 'floor';
  level: number;
  parentCode?: string;
  chainageStart?: number;
  chainageEnd?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: Date;
  updatedAt: Date;
}

// --- Schedule & Payment ---
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
  createdAt: Date;
  updatedAt: Date;
}

// --- Management Plans ---
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
  createdAt: Date;
  updatedAt: Date;
}

// --- Materials & Testing ---
export interface MaterialNode {
  projectId: string;
  code: string;
  name: string;
  type: string;
  supplier: string;
  specification: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestMethodNode {
  projectId: string;
  code: string;
  name: string;
  standard: string;
  procedure: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Lots (Created by scripts, not agents) ---
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
  createdAt: Date;
  updatedAt: Date;
}

export interface ITPInstanceNode {
  projectId: string;
  lotNumber: string;
  templateDocNo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  startDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AGENT 1: PROJECT DETAILS AGENT
// ============================================================================
// Prompt: @prompts/project-details.md
// Input: Contract documents, project charter
// Output: Project root node + basic reference data

export interface ProjectDetailsAgentOutput {
  project: ProjectNode;
  
  referenceData?: {
    workTypes?: WorkTypeNode[];
    areaCodes?: AreaCodeNode[];
  };
}

// Pages that display this data:
// - /projects/[projectId] - Project overview
// - /projects/[projectId]/settings - Project settings

export const ProjectDetailsAgentOutputSchema = z.object({
  project: z.object({
    projectId: z.string(),
    name: z.string(),
    code: z.string().optional(),
    contractNumber: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  }),
  referenceData: z.object({
    workTypes: z.array(z.object({
      projectId: z.string(),
      code: z.string(),
      description: z.string(),
    })).optional(),
    areaCodes: z.array(z.object({
      projectId: z.string(),
      code: z.string(),
      description: z.string(),
    })).optional(),
  }).optional(),
});

// ============================================================================
// AGENT 2: DOCUMENT METADATA AGENT
// ============================================================================
// Prompt: @prompts/document-metadata.md
// Input: Uploaded documents (PDFs, drawings)
// Output: Document register with metadata

export interface DocumentMetadataAgentOutput {
  documents: Array<{
    node: DocumentNode;
    relationships: {
      supersedes?: string[];  // documentNumber-revisionCode
    };
  }>;
}

// Pages that display this data:
// - /projects/[projectId]/documents - Document register
// - /projects/[projectId]/documents/[docId] - Document detail

export const DocumentMetadataAgentOutputSchema = z.object({
  documents: z.array(z.object({
    node: z.object({
      projectId: z.string(),
      documentNumber: z.string(),
      revisionCode: z.string(),
      docKind: z.enum(['drawing', 'document']),
      title: z.string().optional(),
      type: z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'other']).optional(),
      status: z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']),
      fileUrl: z.string().optional(),
    }),
    relationships: z.object({
      supersedes: z.array(z.string()).optional(),
    }),
  })),
});

// ============================================================================
// AGENT 3: STANDARDS EXTRACTION AGENT
// ============================================================================
// Prompt: @prompts/standards-extraction.md
// Input: Specification documents
// Output: List of applicable standards

export interface StandardsExtractionAgentOutput {
  standards: StandardNode[];
}

// Pages that display this data:
// - /projects/[projectId]/standards - Standards register
// - /projects/[projectId]/quality/itps - (Referenced in ITPs)

export const StandardsExtractionAgentOutputSchema = z.object({
  standards: z.array(z.object({
    projectId: z.string(),
    code: z.string(),
    title: z.string(),
    version: z.string().optional(),
    authority: z.string().optional(),
  })),
});

// ============================================================================
// AGENT 4: PQP GENERATION AGENT
// ============================================================================
// Prompt: @prompts/pqp-generation.md
// Input: Specification documents, contract requirements
// Output: PQP document + ITP template list

export interface PQPGenerationAgentOutput {
  managementPlan: ManagementPlanNode;
  
  itpTemplates: Array<{
    template: ITPTemplateNode;
    inspectionPoints: InspectionPointNode[];
    relationships: {
      usesWorkType: string;           // WorkType.code
      referencesStandards: string[];  // Standard.code[]
      referencesDocuments: string[];  // Document.documentNumber
    };
  }>;
  
  // May also create reference data if not exists
  referenceData?: {
    workTypes?: WorkTypeNode[];
    standards?: StandardNode[];
  };
}

// Pages that display this data:
// - /projects/[projectId]/quality/pqp - PQP document viewer
// - /projects/[projectId]/quality/itps - ITP template list
// - /projects/[projectId]/quality/itps/[docNo] - ITP template detail

export const PQPGenerationAgentOutputSchema = z.object({
  managementPlan: z.object({
    projectId: z.string(),
    type: z.literal('PQP'),
    title: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
    content: z.string().optional(),
    htmlContent: z.string().optional(),
  }),
  itpTemplates: z.array(z.object({
    template: z.object({
      projectId: z.string(),
      docNo: z.string(),
      description: z.string(),
      workType: z.string(),
      specRef: z.string(),
      status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
      approvalStatus: z.enum(['not_required', 'pending', 'approved', 'rejected']),
      revisionDate: z.coerce.date(),
      revisionNumber: z.string(),
    }),
    inspectionPoints: z.array(z.object({
      projectId: z.string(),
      parentType: z.literal('template'),
      parentKey: z.string(),
      sequence: z.number(),
      description: z.string(),
      type: z.enum(['hold', 'witness', 'surveillance', 'record']),
      requirement: z.string(),
      isHoldPoint: z.boolean(),
      isWitnessPoint: z.boolean(),
    })),
    relationships: z.object({
      usesWorkType: z.string(),
      referencesStandards: z.array(z.string()),
      referencesDocuments: z.array(z.string()),
    }),
  })),
  referenceData: z.object({
    workTypes: z.array(z.object({
      projectId: z.string(),
      code: z.string(),
      description: z.string(),
    })).optional(),
    standards: z.array(z.object({
      projectId: z.string(),
      code: z.string(),
      title: z.string(),
    })).optional(),
  }).optional(),
});

// ============================================================================
// AGENT 5: ITP GENERATION AGENT
// ============================================================================
// Prompt: @prompts/itp-generation.md
// Input: Specification section, work type
// Output: Detailed ITP template with inspection points

export interface ITPGenerationAgentOutput {
  template: ITPTemplateNode;
  inspectionPoints: InspectionPointNode[];
  relationships: {
    usesWorkType: string;
    referencesStandards: string[];
    referencesDocuments: string[];
  };
}

// Pages that display this data:
// - /projects/[projectId]/quality/itps/[docNo] - ITP template detail
// - /projects/[projectId]/quality/itps/[docNo]/edit - ITP template editor

export const ITPGenerationAgentOutputSchema = z.object({
  template: z.object({
    projectId: z.string(),
    docNo: z.string(),
    description: z.string(),
    workType: z.string(),
    specRef: z.string(),
    jurisdiction: z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']).optional(),
    applicableStandards: z.array(z.string()).optional(),
    status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
    approvalStatus: z.enum(['not_required', 'pending', 'approved', 'rejected']),
    revisionDate: z.coerce.date(),
    revisionNumber: z.string(),
  }),
  inspectionPoints: z.array(z.object({
    projectId: z.string(),
    parentType: z.literal('template'),
    parentKey: z.string(),
    sequence: z.number(),
    description: z.string(),
    type: z.enum(['hold', 'witness', 'surveillance', 'record']),
    section: z.enum(['preliminaries', 'materials', 'pre_construction', 'construction', 'geometrics', 'conformance']).optional(),
    requirement: z.string(),
    acceptanceCriteria: z.string().optional(),
    testMethod: z.string().optional(),
    isHoldPoint: z.boolean(),
    isWitnessPoint: z.boolean(),
  })),
  relationships: z.object({
    usesWorkType: z.string(),
    referencesStandards: z.array(z.string()),
    referencesDocuments: z.array(z.string()),
  }),
});

// ============================================================================
// AGENT 6: WBS EXTRACTION AGENT
// ============================================================================
// Prompt: @prompts/wbs-extraction.md
// Input: Project program, schedule documents
// Output: Work breakdown structure hierarchy

export interface WBSExtractionAgentOutput {
  wbsNodes: Array<{
    node: WBSNodeType;
    relationships: {
      parentCode?: string;
      requiresITPs: string[];         // ITP_Template.docNo[]
      referencesDocuments: string[];  // Document.documentNumber[]
    };
  }>;
}

// Pages that display this data:
// - /projects/[projectId]/structure/wbs - WBS tree view
// - /projects/[projectId]/structure/wbs/[code] - WBS node detail

export const WBSExtractionAgentOutputSchema = z.object({
  wbsNodes: z.array(z.object({
    node: z.object({
      projectId: z.string(),
      code: z.string(),
      name: z.string(),
      level: z.number(),
      parentCode: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
      percentComplete: z.number().optional(),
    }),
    relationships: z.object({
      parentCode: z.string().optional(),
      requiresITPs: z.array(z.string()),
      referencesDocuments: z.array(z.string()),
    }),
  })),
});

// ============================================================================
// AGENT 7: LBS EXTRACTION AGENT
// ============================================================================
// Prompt: @prompts/lbs-extraction.md
// Input: Site drawings, layout plans
// Output: Location breakdown structure hierarchy

export interface LBSExtractionAgentOutput {
  lbsNodes: Array<{
    node: LBSNodeType;
    relationships: {
      parentCode?: string;
      linkedToWBS: string[];          // WBSNode.code[]
      referencesDocuments: string[];  // Document.documentNumber[]
    };
  }>;
}

// Pages that display this data:
// - /projects/[projectId]/structure/lbs - LBS tree view
// - /projects/[projectId]/structure/lbs/[code] - LBS node detail

export const LBSExtractionAgentOutputSchema = z.object({
  lbsNodes: z.array(z.object({
    node: z.object({
      projectId: z.string(),
      code: z.string(),
      name: z.string(),
      type: z.enum(['site', 'zone', 'chainage', 'layer', 'element', 'building', 'floor']),
      level: z.number(),
      parentCode: z.string().optional(),
      chainageStart: z.number().optional(),
      chainageEnd: z.number().optional(),
      status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
    }),
    relationships: z.object({
      parentCode: z.string().optional(),
      linkedToWBS: z.array(z.string()),
      referencesDocuments: z.array(z.string()),
    }),
  })),
});

// ============================================================================
// AGENT 8: QSE GENERATION AGENT
// ============================================================================
// Prompt: @prompts/qse-generation.md
// Input: Contract schedule, BOQ documents
// Output: Schedule items (Bill of Quantities)

export interface QSEGenerationAgentOutput {
  scheduleItems: Array<{
    item: ScheduleItemNode;
    relationships: {
      usesWorkType?: string;  // WorkType.code
    };
  }>;
}

// Pages that display this data:
// - /projects/[projectId]/commercial/schedule - Schedule items list
// - /projects/[projectId]/commercial/schedule/[number] - Schedule item detail

export const QSEGenerationAgentOutputSchema = z.object({
  scheduleItems: z.array(z.object({
    item: z.object({
      projectId: z.string(),
      number: z.string(),
      description: z.string(),
      unit: z.string(),
      quantity: z.number(),
      rate: z.number(),
      amount: z.number(),
      category: z.string().optional(),
      workType: z.string().optional(),
    }),
    relationships: z.object({
      usesWorkType: z.string().optional(),
    }),
  })),
});

// ============================================================================
// AGENT 9: OHSMP GENERATION AGENT
// ============================================================================
// Prompt: @prompts/ohsmp-generation.md
// Input: Safety specifications, regulations
// Output: OH&S Management Plan

export interface OHSMPGenerationAgentOutput {
  managementPlan: ManagementPlanNode;
}

// Pages that display this data:
// - /projects/[projectId]/safety/ohsmp - OHSMP document viewer

export const OHSMPGenerationAgentOutputSchema = z.object({
  managementPlan: z.object({
    projectId: z.string(),
    type: z.literal('OHSMP'),
    title: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
    content: z.string().optional(),
    htmlContent: z.string().optional(),
  }),
});

// ============================================================================
// AGENT 10: EMP GENERATION AGENT
// ============================================================================
// Prompt: @prompts/emp-generation.md
// Input: Environmental specifications, regulations
// Output: Environmental Management Plan

export interface EMPGenerationAgentOutput {
  managementPlan: ManagementPlanNode;
}

// Pages that display this data:
// - /projects/[projectId]/environment/emp - EMP document viewer

export const EMPGenerationAgentOutputSchema = z.object({
  managementPlan: z.object({
    projectId: z.string(),
    type: z.literal('EMP'),
    title: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
    content: z.string().optional(),
    htmlContent: z.string().optional(),
  }),
});

// ============================================================================
// MASTER OUTPUT (All agents combined)
// ============================================================================

export interface MasterProjectOutput {
  // Agent 1: Project Details
  project?: ProjectNode;
  
  // Agent 2: Document Metadata
  documents?: Array<{
    node: DocumentNode;
    relationships: { supersedes?: string[] };
  }>;
  
  // Agent 3: Standards Extraction
  standards?: StandardNode[];
  
  // Agent 4: PQP Generation
  pqp?: {
    managementPlan: ManagementPlanNode;
    itpTemplates: Array<{
      template: ITPTemplateNode;
      inspectionPoints: InspectionPointNode[];
      relationships: {
        usesWorkType: string;
        referencesStandards: string[];
        referencesDocuments: string[];
      };
    }>;
  };
  
  // Agent 5: ITP Generation (individual)
  itpTemplate?: {
    template: ITPTemplateNode;
    inspectionPoints: InspectionPointNode[];
    relationships: {
      usesWorkType: string;
      referencesStandards: string[];
      referencesDocuments: string[];
    };
  };
  
  // Agent 6: WBS Extraction
  wbs?: Array<{
    node: WBSNodeType;
    relationships: {
      parentCode?: string;
      requiresITPs: string[];
      referencesDocuments: string[];
    };
  }>;
  
  // Agent 7: LBS Extraction
  lbs?: Array<{
    node: LBSNodeType;
    relationships: {
      parentCode?: string;
      linkedToWBS: string[];
      referencesDocuments: string[];
    };
  }>;
  
  // Agent 8: QSE Generation
  scheduleItems?: Array<{
    item: ScheduleItemNode;
    relationships: { usesWorkType?: string };
  }>;
  
  // Agent 9: OHSMP Generation
  ohsmp?: ManagementPlanNode;
  
  // Agent 10: EMP Generation
  emp?: ManagementPlanNode;
  
  // Reference Data (can be created by multiple agents)
  referenceData?: {
    workTypes?: WorkTypeNode[];
    areaCodes?: AreaCodeNode[];
    standards?: StandardNode[];
    suppliers?: SupplierNode[];
    laboratories?: LaboratoryNode[];
  };
}

// ============================================================================
// HELPER: Extract agent-specific schema
// ============================================================================

export function getAgentSchema(agentName: string): z.ZodSchema {
  const schemas: Record<string, z.ZodSchema> = {
    'project-details': ProjectDetailsAgentOutputSchema,
    'document-metadata': DocumentMetadataAgentOutputSchema,
    'standards-extraction': StandardsExtractionAgentOutputSchema,
    'pqp-generation': PQPGenerationAgentOutputSchema,
    'itp-generation': ITPGenerationAgentOutputSchema,
    'wbs-extraction': WBSExtractionAgentOutputSchema,
    'lbs-extraction': LBSExtractionAgentOutputSchema,
    'qse-generation': QSEGenerationAgentOutputSchema,
    'ohsmp-generation': OHSMPGenerationAgentOutputSchema,
    'emp-generation': EMPGenerationAgentOutputSchema,
  };
  
  return schemas[agentName] || z.any();
}

// ============================================================================
// HELPER: Page to data mapping
// ============================================================================

export const PAGE_DATA_MAP = {
  // Project pages
  '/projects/[projectId]': ['project'],
  '/projects/[projectId]/settings': ['project', 'referenceData'],
  
  // Document pages
  '/projects/[projectId]/documents': ['documents'],
  '/projects/[projectId]/documents/[docId]': ['documents'],
  
  // Quality pages
  '/projects/[projectId]/quality/pqp': ['pqp.managementPlan'],
  '/projects/[projectId]/quality/itps': ['pqp.itpTemplates', 'itpTemplate'],
  '/projects/[projectId]/quality/itps/[docNo]': ['itpTemplate'],
  
  // Structure pages
  '/projects/[projectId]/structure/wbs': ['wbs'],
  '/projects/[projectId]/structure/wbs/[code]': ['wbs'],
  '/projects/[projectId]/structure/lbs': ['lbs'],
  '/projects/[projectId]/structure/lbs/[code]': ['lbs'],
  
  // Commercial pages
  '/projects/[projectId]/commercial/schedule': ['scheduleItems'],
  
  // Safety & Environment pages
  '/projects/[projectId]/safety/ohsmp': ['ohsmp'],
  '/projects/[projectId]/environment/emp': ['emp'],
  
  // Standards pages
  '/projects/[projectId]/standards': ['standards'],
} as const;

