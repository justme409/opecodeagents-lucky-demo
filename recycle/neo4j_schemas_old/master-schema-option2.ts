import { z } from 'zod';

/**
 * ============================================================================
 * MASTER PROJECT SCHEMA - OPTION 2: DOMAIN-CENTRIC
 * ============================================================================
 * 
 * Organization: Grouped by business domain/feature area
 * 
 * Benefits:
 * - Logical grouping for frontend developers
 * - Easy to find related entities
 * - Better for page-based data fetching
 * 
 * Structure:
 * - Each section = One business domain
 * - Multiple agents may contribute to one domain
 * - Pages map naturally to domains
 */

// ============================================================================
// DOMAIN 1: PROJECT & REFERENCE DATA
// ============================================================================
// Created by: Project Details Agent, multiple agents
// Pages: /projects/[projectId], /projects/[projectId]/settings

export namespace ProjectDomain {
  export interface Project {
    projectId: string;
    name: string;
    code?: string;
    contractNumber?: string;
    description?: string;
    status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface WorkType {
    projectId: string;
    code: string;
    description: string;
    metadata?: Record<string, any>;
  }
  
  export interface AreaCode {
    projectId: string;
    code: string;
    description: string;
    metadata?: Record<string, any>;
  }
  
  export interface Standard {
    projectId: string;
    code: string;
    title: string;
    version?: string;
    authority?: string;
    url?: string;
  }
  
  export interface Supplier {
    projectId: string;
    code: string;
    name: string;
    abn?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
  }
  
  export interface Laboratory {
    projectId: string;
    code: string;
    name: string;
    nataNumber?: string;
    accreditations?: string[];
    contactEmail?: string;
    contactPhone?: string;
  }
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    // Project Details Agent
    projectDetails?: {
      agent: 'project-details';
      prompt: '@prompts/project-details.md';
      output: {
        project: Project;
        referenceData?: {
          workTypes?: WorkType[];
          areaCodes?: AreaCode[];
        };
      };
    };
    
    // Standards Extraction Agent
    standards?: {
      agent: 'standards-extraction';
      prompt: '@prompts/standards-extraction.md';
      output: {
        standards: Standard[];
      };
    };
  }
  
  // Zod schemas
  export const ProjectSchema = z.object({
    projectId: z.string(),
    name: z.string(),
    code: z.string().optional(),
    contractNumber: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  });
  
  export const WorkTypeSchema = z.object({
    projectId: z.string(),
    code: z.string(),
    description: z.string(),
  });
  
  export const StandardSchema = z.object({
    projectId: z.string(),
    code: z.string(),
    title: z.string(),
    version: z.string().optional(),
    authority: z.string().optional(),
  });
}

// ============================================================================
// DOMAIN 2: DOCUMENTS & DRAWINGS
// ============================================================================
// Created by: Document Metadata Agent
// Pages: /projects/[projectId]/documents, /projects/[projectId]/documents/[docId]

export namespace DocumentDomain {
  export interface Document {
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
  
  export interface DocumentRelationships {
    supersedes?: string[];        // documentNumber-revisionCode
    supersededBy?: string;
    referencedBy?: {
      wbs?: string[];             // WBS codes
      lbs?: string[];             // LBS codes
      itps?: string[];            // ITP docNos
    };
  }
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    documentMetadata: {
      agent: 'document-metadata';
      prompt: '@prompts/document-metadata.md';
      output: {
        documents: Array<{
          node: Document;
          relationships: DocumentRelationships;
        }>;
      };
    };
  }
  
  // Zod schemas
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
}

// ============================================================================
// DOMAIN 3: QUALITY MANAGEMENT
// ============================================================================
// Created by: PQP Agent, ITP Agent
// Pages: /projects/[projectId]/quality/*

export namespace QualityDomain {
  export interface ManagementPlan {
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
  
  export interface ITPTemplate {
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
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface InspectionPoint {
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
  
  export interface ITPTemplateRelationships {
    usesWorkType: string;           // WorkType.code
    referencesStandards: string[];  // Standard.code[]
    referencesDocuments: string[];  // Document.documentNumber
  }
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    // PQP Generation Agent
    pqpGeneration?: {
      agent: 'pqp-generation';
      prompt: '@prompts/pqp-generation.md';
      output: {
        managementPlan: ManagementPlan;
        itpTemplates: Array<{
          template: ITPTemplate;
          inspectionPoints: InspectionPoint[];
          relationships: ITPTemplateRelationships;
        }>;
      };
    };
    
    // ITP Generation Agent (individual)
    itpGeneration?: {
      agent: 'itp-generation';
      prompt: '@prompts/itp-generation.md';
      output: {
        template: ITPTemplate;
        inspectionPoints: InspectionPoint[];
        relationships: ITPTemplateRelationships;
      };
    };
  }
  
  // Zod schemas
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
}

// ============================================================================
// DOMAIN 4: PROJECT STRUCTURE
// ============================================================================
// Created by: WBS Agent, LBS Agent
// Pages: /projects/[projectId]/structure/*

export namespace StructureDomain {
  export interface WBSNode {
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
  
  export interface WBSNodeRelationships {
    parentCode?: string;
    requiresITPs: string[];         // ITP_Template.docNo[]
    referencesDocuments: string[];  // Document.documentNumber[]
    linkedToLBS?: string[];         // LBS.code[]
  }
  
  export interface LBSNode {
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
  
  export interface LBSNodeRelationships {
    parentCode?: string;
    linkedToWBS: string[];          // WBSNode.code[]
    referencesDocuments: string[];  // Document.documentNumber[]
  }
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    // WBS Extraction Agent
    wbsExtraction?: {
      agent: 'wbs-extraction';
      prompt: '@prompts/wbs-extraction.md';
      output: {
        wbsNodes: Array<{
          node: WBSNode;
          relationships: WBSNodeRelationships;
        }>;
      };
    };
    
    // LBS Extraction Agent
    lbsExtraction?: {
      agent: 'lbs-extraction';
      prompt: '@prompts/lbs-extraction.md';
      output: {
        lbsNodes: Array<{
          node: LBSNode;
          relationships: LBSNodeRelationships;
        }>;
      };
    };
  }
  
  // Zod schemas
  export const WBSNodeSchema = z.object({
    projectId: z.string(),
    code: z.string(),
    name: z.string(),
    level: z.number(),
    parentCode: z.string().optional(),
    status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']).optional(),
  });
  
  export const LBSNodeSchema = z.object({
    projectId: z.string(),
    code: z.string(),
    name: z.string(),
    type: z.enum(['site', 'zone', 'chainage', 'layer', 'element', 'building', 'floor']),
    level: z.number(),
    parentCode: z.string().optional(),
  });
}

// ============================================================================
// DOMAIN 5: COMMERCIAL & PAYMENT
// ============================================================================
// Created by: QSE Agent
// Pages: /projects/[projectId]/commercial/*

export namespace CommercialDomain {
  export interface ScheduleItem {
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
  
  export interface ScheduleItemRelationships {
    usesWorkType?: string;  // WorkType.code
  }
  
  export interface ProgressClaim {
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
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Variation {
    projectId: string;
    number: string;
    description: string;
    status: 'proposed' | 'approved' | 'rejected' | 'implemented';
    amount: number;
    approvedDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    // QSE Generation Agent
    qseGeneration?: {
      agent: 'qse-generation';
      prompt: '@prompts/qse-generation.md';
      output: {
        scheduleItems: Array<{
          item: ScheduleItem;
          relationships: ScheduleItemRelationships;
        }>;
      };
    };
  }
  
  // Zod schemas
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
}

// ============================================================================
// DOMAIN 6: SAFETY & ENVIRONMENT
// ============================================================================
// Created by: OHSMP Agent, EMP Agent
// Pages: /projects/[projectId]/safety/*, /projects/[projectId]/environment/*

export namespace SafetyEnvironmentDomain {
  export interface ManagementPlan {
    projectId: string;
    type: 'OHSMP' | 'EMP' | 'CEMP' | 'TMP';
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
  
  // Agent outputs for this domain
  export interface AgentOutputs {
    // OHSMP Generation Agent
    ohsmpGeneration?: {
      agent: 'ohsmp-generation';
      prompt: '@prompts/ohsmp-generation.md';
      output: {
        managementPlan: ManagementPlan;
      };
    };
    
    // EMP Generation Agent
    empGeneration?: {
      agent: 'emp-generation';
      prompt: '@prompts/emp-generation.md';
      output: {
        managementPlan: ManagementPlan;
      };
    };
  }
  
  // Zod schemas
  export const ManagementPlanSchema = z.object({
    projectId: z.string(),
    type: z.enum(['OHSMP', 'EMP', 'CEMP', 'TMP']),
    title: z.string(),
    version: z.string(),
    status: z.enum(['draft', 'in_review', 'approved', 'superseded']),
    htmlContent: z.string().optional(),
  });
}

// ============================================================================
// DOMAIN 7: FIELD OPERATIONS (Created by scripts, not agents)
// ============================================================================
// Created by: Lot creation scripts
// Pages: /projects/[projectId]/lots/*, /projects/[projectId]/lots/[lotId]/*

export namespace FieldOperationsDomain {
  export interface Lot {
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
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ITPInstance {
    projectId: string;
    lotNumber: string;
    templateDocNo: string;
    status: 'pending' | 'in_progress' | 'completed' | 'approved';
    startDate?: Date;
    completedDate?: Date;
    approvedDate?: Date;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface NCR {
    projectId: string;
    number: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    status: 'open' | 'investigation' | 'resolution_proposed' | 'approved' | 'closed';
    raisedDate: Date;
    raisedBy: string;
    lotNumber?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // NOTE: These are NOT created by agents!
  // They are created by scripts/manual entry
}

// ============================================================================
// MASTER OUTPUT (All domains combined)
// ============================================================================

export interface MasterProjectOutput {
  project?: ProjectDomain.AgentOutputs;
  documents?: DocumentDomain.AgentOutputs;
  quality?: QualityDomain.AgentOutputs;
  structure?: StructureDomain.AgentOutputs;
  commercial?: CommercialDomain.AgentOutputs;
  safetyEnvironment?: SafetyEnvironmentDomain.AgentOutputs;
}

// ============================================================================
// HELPER: Get schema by domain
// ============================================================================

export function getDomainSchemas(domain: string) {
  const schemas: Record<string, Record<string, z.ZodSchema>> = {
    project: {
      Project: ProjectDomain.ProjectSchema,
      WorkType: ProjectDomain.WorkTypeSchema,
      Standard: ProjectDomain.StandardSchema,
    },
    documents: {
      Document: DocumentDomain.DocumentSchema,
    },
    quality: {
      ITPTemplate: QualityDomain.ITPTemplateSchema,
      InspectionPoint: QualityDomain.InspectionPointSchema,
    },
    structure: {
      WBSNode: StructureDomain.WBSNodeSchema,
      LBSNode: StructureDomain.LBSNodeSchema,
    },
    commercial: {
      ScheduleItem: CommercialDomain.ScheduleItemSchema,
    },
    safetyEnvironment: {
      ManagementPlan: SafetyEnvironmentDomain.ManagementPlanSchema,
    },
  };
  
  return schemas[domain] || {};
}

// ============================================================================
// HELPER: Page to domain mapping
// ============================================================================

export const PAGE_DOMAIN_MAP = {
  // Project pages
  '/projects/[projectId]': 'project',
  '/projects/[projectId]/settings': 'project',
  
  // Document pages
  '/projects/[projectId]/documents': 'documents',
  '/projects/[projectId]/documents/[docId]': 'documents',
  
  // Quality pages
  '/projects/[projectId]/quality/pqp': 'quality',
  '/projects/[projectId]/quality/itps': 'quality',
  '/projects/[projectId]/quality/itps/[docNo]': 'quality',
  
  // Structure pages
  '/projects/[projectId]/structure/wbs': 'structure',
  '/projects/[projectId]/structure/wbs/[code]': 'structure',
  '/projects/[projectId]/structure/lbs': 'structure',
  '/projects/[projectId]/structure/lbs/[code]': 'structure',
  
  // Commercial pages
  '/projects/[projectId]/commercial/schedule': 'commercial',
  '/projects/[projectId]/commercial/claims': 'commercial',
  
  // Safety & Environment pages
  '/projects/[projectId]/safety/ohsmp': 'safetyEnvironment',
  '/projects/[projectId]/environment/emp': 'safetyEnvironment',
  
  // Field operations pages (not agent-generated)
  '/projects/[projectId]/lots': 'fieldOperations',
  '/projects/[projectId]/lots/[lotId]': 'fieldOperations',
} as const;

