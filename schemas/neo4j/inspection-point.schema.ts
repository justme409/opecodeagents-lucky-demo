import { z } from 'zod';

/**
 * INSPECTION POINT SCHEMA
 * 
 * Individual inspection points within an ITP. Can be hold points (work cannot
 * proceed until approved), witness points (client must be present), or
 * surveillance points (contractor self-checks).
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface InspectionPointNode {
  id: string;
  sequence: number;
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
  requiredBy?: string;          // Who requires this inspection (User ID)
  responsibleParty?: string;    // Who performs it (e.g., "Contractor QC", "Third-party lab")
  
  // Completion
  completedBy?: string;
  completedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Additional Info
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const InspectionPointTypeEnum = z.enum(['hold', 'witness', 'surveillance', 'record']);
export const InspectionPointStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'approved', 'rejected']);
export const ITPSectionEnum = z.enum(['preliminaries', 'materials', 'pre_construction', 'construction', 'geometrics', 'conformance']);

export const InspectionPointNodeSchema = z.object({
  id: z.string().uuid(),
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
  requiredBy: z.string().uuid().optional(),
  responsibleParty: z.string().optional(),
  
  // Completion
  completedBy: z.string().uuid().optional(),
  completedDate: z.coerce.date().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedDate: z.coerce.date().optional(),
  
  // Additional Info
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateInspectionPointInputSchema = InspectionPointNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  status: true,
  isHoldPoint: true,
  isWitnessPoint: true,
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const INSPECTION_POINT_CONSTRAINTS = `
  CREATE CONSTRAINT inspection_point_id_unique IF NOT EXISTS
  FOR (ip:InspectionPoint) REQUIRE ip.id IS UNIQUE;
  
  CREATE INDEX inspection_point_type IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.type);
  
  CREATE INDEX inspection_point_status IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.status);
  
  CREATE INDEX inspection_point_hold IF NOT EXISTS
  FOR (ip:InspectionPoint) ON (ip.isHoldPoint);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const INSPECTION_POINT_QUERIES = {
  getAllPoints: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(itp:ITP_Template|ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN ip
    ORDER BY ip.sequence
  `,
  
  getPendingPoints: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(itp:ITP_Template|ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.status = 'pending'
      AND (ip.isDeleted IS NULL OR ip.isDeleted = false)
    RETURN ip
    ORDER BY ip.sequence
  `,
  
  getHoldPoints: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(itp:ITP_Template|ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isHoldPoint = true
      AND (ip.isDeleted IS NULL OR ip.isDeleted = false)
    RETURN ip
    ORDER BY ip.sequence
  `,
  
  getPointsByInstance: `
    MATCH (i:ITP_Instance {id: $instanceId})-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN ip
    ORDER BY ip.sequence
  `,
  
  getOpenHoldPoints: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)-[:IMPLEMENTS]->(i:ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isHoldPoint = true 
      AND ip.status IN ['pending', 'in_progress']
      AND (ip.isDeleted IS NULL OR ip.isDeleted = false)
    RETURN ip, i, l
    ORDER BY l.number, ip.sequence
  `,
  
  createPoint: `
    CREATE (ip:InspectionPoint $properties)
    SET ip.id = randomUUID()
    SET ip.createdAt = datetime()
    SET ip.updatedAt = datetime()
    SET ip.status = coalesce(ip.status, 'pending')
    SET ip.isHoldPoint = coalesce(ip.isHoldPoint, false)
    SET ip.isWitnessPoint = coalesce(ip.isWitnessPoint, false)
    RETURN ip
  `,
  
  completePoint: `
    MATCH (ip:InspectionPoint {id: $pointId})
    SET ip.status = 'completed'
    SET ip.completedBy = $userId
    SET ip.completedDate = datetime()
    SET ip.updatedAt = datetime()
    RETURN ip
  `,
  
  approvePoint: `
    MATCH (ip:InspectionPoint {id: $pointId})
    SET ip.status = 'approved'
    SET ip.approvedBy = $userId
    SET ip.approvedDate = datetime()
    SET ip.updatedAt = datetime()
    RETURN ip
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const INSPECTION_POINT_RELATIONSHIPS = {
  outgoing: [
    { type: 'BLOCKS', target: 'Lot', cardinality: '0..1' },
  ],
  incoming: [
    { type: 'HAS_POINT', source: 'ITP_Template', cardinality: '1' },
    { type: 'HAS_POINT', source: 'ITP_Instance', cardinality: '1' },
    { type: 'RELATED_TO', source: 'Photo', cardinality: '0..*' },
    { type: 'RELATED_TO', source: 'NCR', cardinality: '0..*' },
  ],
};

export type InspectionPointType = z.infer<typeof InspectionPointTypeEnum>;
export type InspectionPointStatus = z.infer<typeof InspectionPointStatusEnum>;
export type CreateInspectionPointInput = z.infer<typeof CreateInspectionPointInputSchema>;

