import { z } from 'zod';

/**
 * LOT SCHEMA
 * 
 * Core node for quality tracking. Lots represent discrete work packages
 * that are inspected, tested, and conformed before payment.
 * 
 * Primary Key: (projectId, number)
 * Agent generates lots from specification documents by:
 * - Extracting lot definitions and numbering patterns
 * - Assigning work types and area codes
 * - Setting chainages and locations
 * - Linking to relevant ITP templates
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface LotNode {
  projectId: string;                // Project ID (REQUIRED)
  number: string;                   // Lot number (REQUIRED, e.g., "SG-CH0000-CH0500-001")
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
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface LotRelationships {
  belongsToProject: string;      // Project ID
  locatedIn?: string;            // LBS Node code
  coversWBS?: string[];          // WBS Node codes
  implements?: string[];         // ITP Instance IDs
  hasNCR?: string[];             // NCR numbers
  hasTest?: string[];            // Test Request numbers
  usesMaterial?: string[];       // Material codes
  hasQuantity?: string[];        // Quantity IDs
  relatedDocuments?: string[];   // Document numbers
  relatedPhotos?: string[];      // Photo IDs
}

export interface LotWithRelationships extends LotNode {
  relationships: LotRelationships;
  // Populated relationship data
  itpInstances?: any[];
  ncrs?: any[];
  tests?: any[];
  materials?: any[];
  quantities?: any[];
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const LotStatusEnum = z.enum(['open', 'in_progress', 'conformed', 'closed']);

export const LotNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Lot number is required'),
  status: LotStatusEnum,
  percentComplete: z.number().min(0).max(100),
  description: z.string().min(1, 'Description is required'),
  workType: z.string().min(1, 'Work type is required'),
  areaCode: z.string().min(1, 'Area code is required'),
  startChainage: z.number(),
  endChainage: z.number(),
  startDate: z.coerce.date(),
  conformedDate: z.coerce.date().optional(),
  closedDate: z.coerce.date().optional(),
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

export const CreateLotInputSchema = LotNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  percentComplete: true,
  conformedDate: true,
  closedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateLotInputSchema = LotNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const LOT_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT lot_unique IF NOT EXISTS
  FOR (l:Lot) REQUIRE (l.projectId, l.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX lot_project_id IF NOT EXISTS
  FOR (l:Lot) ON (l.projectId);
  
  CREATE INDEX lot_status IF NOT EXISTS
  FOR (l:Lot) ON (l.status);
  
  CREATE INDEX lot_work_type IF NOT EXISTS
  FOR (l:Lot) ON (l.workType);
  
  CREATE INDEX lot_area_code IF NOT EXISTS
  FOR (l:Lot) ON (l.areaCode);
  
  CREATE INDEX lot_percent_complete IF NOT EXISTS
  FOR (l:Lot) ON (l.percentComplete);
  
  CREATE INDEX lot_dates IF NOT EXISTS
  FOR (l:Lot) ON (l.startDate, l.conformedDate);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentLotOutput {
  lots: Array<{
    number: string;
    description: string;
    workType: string;
    areaCode: string;
    startChainage: number;
    endChainage: number;
    startDate: string;           // ISO date string
    notes?: string;
    relationships: {
      itpTemplateDocNo?: string; // Link to ITP by doc number
      wbsCodes?: string[];       // Link to WBS by code
      lbsCode?: string;          // Link to LBS by code
    };
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const LOT_QUERIES = {
  // Get all lots for a project
  getAllLots: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.number
  `,
  
  // Get lot with all relationships
  getLotDetail: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (l)-[:IMPLEMENTS]->(itp:ITP_Instance)
    WHERE itp.isDeleted IS NULL OR itp.isDeleted = false
    OPTIONAL MATCH (l)-[:HAS_NCR]->(ncr:NCR)
    WHERE ncr.isDeleted IS NULL OR ncr.isDeleted = false
    OPTIONAL MATCH (l)-[:HAS_TEST]->(test:TestRequest)
    WHERE test.isDeleted IS NULL OR test.isDeleted = false
    OPTIONAL MATCH (l)-[:USES_MATERIAL]->(material:Material)
    WHERE material.isDeleted IS NULL OR material.isDeleted = false
    OPTIONAL MATCH (l)-[:HAS_QUANTITY]->(qty:Quantity)
    WHERE qty.isDeleted IS NULL OR qty.isDeleted = false
    OPTIONAL MATCH (l)<-[:RELATED_TO]-(doc:Document)
    WHERE doc.isDeleted IS NULL OR doc.isDeleted = false
    OPTIONAL MATCH (l)<-[:RELATED_TO]-(photo:Photo)
    WHERE photo.isDeleted IS NULL OR photo.isDeleted = false
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot,
           collect(DISTINCT itp) as itpInstances,
           collect(DISTINCT ncr) as ncrs,
           collect(DISTINCT test) as tests,
           collect(DISTINCT material) as materials,
           collect(DISTINCT qty) as quantities,
           collect(DISTINCT doc) as documents,
           collect(DISTINCT photo) as photos
  `,
  
  // Get lots with open hold points
  getLotsWithHoldPoints: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    MATCH (l)-[:IMPLEMENTS]->(itp:ITP_Instance)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isHoldPoint = true 
      AND ip.status = 'pending'
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
      AND (itp.isDeleted IS NULL OR itp.isDeleted = false)
      AND (ip.isDeleted IS NULL OR ip.isDeleted = false)
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot, 
           count(ip) as holdPointCount
    ORDER BY holdPointCount DESC
  `,
  
  // Get lots by status
  getLotsByStatus: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.status = $status
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.number
  `,
  
  // Get lots by work type
  getLotsByWorkType: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.workType = $workType
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.number
  `,
  
  // Get lots ready for closeout
  getLotsReadyForCloseout: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.status = 'conformed'
      AND l.percentComplete = 100
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
    OPTIONAL MATCH (l)-[:HAS_NCR]->(ncr:NCR)
    WHERE ncr.status <> 'closed'
      AND (ncr.isDeleted IS NULL OR ncr.isDeleted = false)
    WITH l, count(ncr) as openNCRs
    WHERE openNCRs = 0
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.conformedDate
  `,
  
  // Create lot
  createLot: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (l:Lot)
    SET l = $properties
    SET l.projectId = $projectId
    SET l.createdAt = datetime()
    SET l.updatedAt = datetime()
    SET l.status = coalesce(l.status, 'open')
    SET l.percentComplete = coalesce(l.percentComplete, 0)
    CREATE (l)-[:BELONGS_TO_PROJECT]->(p)
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
  `,
  
  // Update lot
  updateLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    SET l += $properties
    SET l.updatedAt = datetime()
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
  `,
  
  // Update lot status
  updateLotStatus: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    SET l.status = $status
    SET l.updatedAt = datetime()
    SET l.conformedDate = CASE 
      WHEN $status = 'conformed' AND l.conformedDate IS NULL 
      THEN datetime() 
      ELSE l.conformedDate 
    END
    SET l.closedDate = CASE 
      WHEN $status = 'closed' AND l.closedDate IS NULL 
      THEN datetime() 
      ELSE l.closedDate 
    END
    RETURN l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
  `,
  
  // Soft delete lot
  deleteLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    SET l.isDeleted = true
    SET l.deletedAt = datetime()
    SET l.deletedBy = $userId
    SET l.updatedAt = datetime()
    RETURN l
  `,
  
  // Get lot statistics for project
  getLotStatistics: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    RETURN 
      count(l) as totalLots,
      count(CASE WHEN l.status = 'open' THEN 1 END) as openLots,
      count(CASE WHEN l.status = 'in_progress' THEN 1 END) as inProgressLots,
      count(CASE WHEN l.status = 'conformed' THEN 1 END) as conformedLots,
      count(CASE WHEN l.status = 'closed' THEN 1 END) as closedLots,
      avg(l.percentComplete) as averageCompletion
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const LOT_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every lot belongs to exactly one project'
    },
    { 
      type: 'LOCATED_IN', 
      target: 'LBS_Node', 
      cardinality: '0..1',
      description: 'Lot may be located in a location breakdown node'
    },
    { 
      type: 'COVERS_WBS', 
      target: 'WBS_Node', 
      cardinality: '0..*',
      description: 'Lot may cover multiple work breakdown nodes'
    },
    { 
      type: 'IMPLEMENTS', 
      target: 'ITP_Instance', 
      cardinality: '0..*',
      description: 'Lot implements one or more ITP instances'
    },
    { 
      type: 'HAS_NCR', 
      target: 'NCR', 
      cardinality: '0..*',
      description: 'Lot may have multiple non-conformance reports'
    },
    { 
      type: 'HAS_TEST', 
      target: 'TestRequest', 
      cardinality: '0..*',
      description: 'Lot may have multiple test requests'
    },
    { 
      type: 'USES_MATERIAL', 
      target: 'Material', 
      cardinality: '0..*',
      description: 'Lot uses one or more materials'
    },
    { 
      type: 'HAS_QUANTITY', 
      target: 'Quantity', 
      cardinality: '0..*',
      description: 'Lot has quantities linked to schedule items'
    },
  ],
  incoming: [
    { 
      type: 'RELATED_TO', 
      source: 'Document', 
      cardinality: '0..*',
      description: 'Documents may be related to lot'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Photo', 
      cardinality: '0..*',
      description: 'Photos may be related to lot'
    },
    { 
      type: 'RELATED_TO', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'NCRs are related to lot'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type LotStatus = z.infer<typeof LotStatusEnum>;
export type CreateLotInput = z.infer<typeof CreateLotInputSchema>;
export type UpdateLotInput = z.infer<typeof UpdateLotInputSchema>;
