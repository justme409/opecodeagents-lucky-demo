import { z } from 'zod';

/**
 * INSPECTION POINT SCHEMA
 * 
 * Individual inspection points within an ITP. Can be hold points (work cannot
 * proceed until approved), witness points (client must be present), or
 * surveillance points (contractor self-checks).
 * 
 * Primary Key: (projectId, parentType, parentKey, sequence)
 * Where parentType is 'template' or 'instance', parentKey is docNo or lot+template combo
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface InspectionPointNode {
  projectId: string;                         // Project ID (REQUIRED)
  parentType: 'template' | 'instance';       // Parent type (REQUIRED)
  parentKey: string;                         // Parent identifier (REQUIRED)
  sequence: number;                          // Sequence number (REQUIRED)
  description: string;
  type: 'hold' | 'witness' | 'surveillance' | 'record';
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  
  // ITP Section
  section?: 'preliminaries' | 'materials' | 'pre_construction' | 'construction' | 'geometrics' | 'conformance';
  
  // Requirements and Criteria
  requirement: string;
  acceptanceCriteria?: string;
  
  // Test/Inspection Details
  testMethod?: string;         // e.g., "AS 1012.3.1", "Visual inspection"
  testFrequency?: string;       // e.g., "1 per 100m³", "Each pour"
  standardsRef?: string[];      // Referenced standards for this point
  
  // Point Types
  isHoldPoint: boolean;
  isWitnessPoint: boolean;
  
  // Responsibilities
  requiredBy?: string;          // Who requires this inspection (User email)
  responsibleParty?: string;    // Who performs it (e.g., "Contractor QC", "Third-party lab")
  
  // Completion
  completedBy?: string;         // User email
  completedDate?: Date;
  approvedBy?: string;          // User email
  approvedDate?: Date;
  
  // Additional Info
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

export const InspectionPointTypeEnum = z.enum(['hold', 'witness', 'surveillance', 'record']);
export const InspectionPointStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'approved', 'rejected']);
export const ITPSectionEnum = z.enum(['preliminaries', 'materials', 'pre_construction', 'construction', 'geometrics', 'conformance']);
export const ParentTypeEnum = z.enum(['template', 'instance']);

export const InspectionPointNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  parentType: ParentTypeEnum,
  parentKey: z.string().min(1, 'Parent key is required'),
  sequence: z.number().int().positive(),
  description: z.string().min(1),
  type: InspectionPointTypeEnum,
  status: InspectionPointStatusEnum,
  
  // ITP Section
  section: ITPSectionEnum.optional(),
  
  // Requirements and Criteria
  requirement: z.string().min(1),
  acceptanceCriteria: z.string().optional(),
  
  // Test/Inspection Details
  testMethod: z.string().optional(),
  testFrequency: z.string().optional(),
  standardsRef: z.array(z.string()).optional(),
  
  // Point Types
  isHoldPoint: z.boolean(),
  isWitnessPoint: z.boolean(),
  
  // Responsibilities
  requiredBy: z.string().optional(),
  responsibleParty: z.string().optional(),
  
  // Completion
  completedBy: z.string().optional(),
  completedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
  
  // Additional Info
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

export const CreateInspectionPointInputSchema = InspectionPointNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  completedBy: true,
  completedDate: true,
  approvedBy: true,
  approvedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateInspectionPointInputSchema = InspectionPointNodeSchema.partial().required({ 
  projectId: true,
  parentType: true,
  parentKey: true,
  sequence: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const INSPECTION_POINT_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT inspection_point_unique IF NOT EXISTS
  FOR (ip:InspectionPoint) REQUIRE (ip.projectId, ip.parentType, ip.parentKey, ip.sequence) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX inspection_point_project_id IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.projectId);
  
  CREATE INDEX inspection_point_parent IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.parentType, ip.parentKey);
  
  CREATE INDEX inspection_point_type IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.type);
  
  CREATE INDEX inspection_point_status IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.status);
  
  CREATE INDEX inspection_point_hold IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.isHoldPoint);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentInspectionPointOutput {
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
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const INSPECTION_POINT_QUERIES = {
  getPointsByTemplate: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $docNo})-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
    ORDER BY ip.sequence
  `,
  
  getPointsByInstance: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
    ORDER BY ip.sequence
  `,
  
  getPendingHoldPoints: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)-[:IMPLEMENTS]->(i:ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isHoldPoint = true
      AND ip.status = 'pending'
      AND (ip.isDeleted IS NULL OR ip.isDeleted = false)
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
      AND (i.isDeleted IS NULL OR i.isDeleted = false)
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point, 
           l.number as lotNumber, 
           i.templateDocNo as templateDocNo
    ORDER BY ip.createdAt
  `,
  
  createPoint: `
    CREATE (ip:InspectionPoint)
    SET ip = $properties
    SET ip.projectId = $projectId
    SET ip.createdAt = datetime()
    SET ip.updatedAt = datetime()
    SET ip.status = coalesce(ip.status, 'pending')
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
  `,
  
  updatePoint: `
    MATCH (ip:InspectionPoint {projectId: $projectId, parentType: $parentType, parentKey: $parentKey, sequence: $sequence})
    SET ip += $properties
    SET ip.updatedAt = datetime()
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
  `,
  
  completePoint: `
    MATCH (ip:InspectionPoint {projectId: $projectId, parentType: $parentType, parentKey: $parentKey, sequence: $sequence})
    SET ip.status = 'completed'
    SET ip.completedDate = datetime()
    SET ip.completedBy = $userEmail
    SET ip.updatedAt = datetime()
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
  `,
  
  approvePoint: `
    MATCH (ip:InspectionPoint {projectId: $projectId, parentType: $parentType, parentKey: $parentKey, sequence: $sequence})
    SET ip.status = 'approved'
    SET ip.approvedDate = datetime()
    SET ip.approvedBy = $userEmail
    SET ip.updatedAt = datetime()
    RETURN ip {
      .*,
      completedDate: toString(ip.completedDate),
      approvedDate: toString(ip.approvedDate),
      createdAt: toString(ip.createdAt),
      updatedAt: toString(ip.updatedAt)
    } as point
  `,
  
  deletePoint: `
    MATCH (ip:InspectionPoint {projectId: $projectId, parentType: $parentType, parentKey: $parentKey, sequence: $sequence})
    SET ip.isDeleted = true
    SET ip.deletedAt = datetime()
    SET ip.deletedBy = $userId
    SET ip.updatedAt = datetime()
    RETURN ip
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const INSPECTION_POINT_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BLOCKS', 
      target: 'Lot', 
      cardinality: '0..1',
      description: 'Hold point may block lot progress'
    },
  ],
  incoming: [
    { 
      type: 'HAS_POINT', 
      source: 'ITP_Template', 
      cardinality: '1',
      description: 'Point belongs to template'
    },
    { 
      type: 'HAS_POINT', 
      source: 'ITP_Instance', 
      cardinality: '1',
      description: 'Point belongs to instance'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Photo', 
      cardinality: '0..*',
      description: 'Photos may be related to point'
    },
    { 
      type: 'RELATED_TO', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'NCRs may be related to point'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type InspectionPointType = z.infer<typeof InspectionPointTypeEnum>;
export type InspectionPointStatus = z.infer<typeof InspectionPointStatusEnum>;
export type ITPSection = z.infer<typeof ITPSectionEnum>;
export type CreateInspectionPointInput = z.infer<typeof CreateInspectionPointInputSchema>;
export type UpdateInspectionPointInput = z.infer<typeof UpdateInspectionPointInputSchema>;
