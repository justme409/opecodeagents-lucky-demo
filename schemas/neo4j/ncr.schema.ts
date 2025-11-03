import { z } from 'zod';

/**
 * NCR (NON-CONFORMANCE REPORT) SCHEMA
 * 
 * Records quality issues, defects, and non-conformances.
 * Tracks resolution and approval workflow.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface NCRNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // NCR number (REQUIRED, e.g., "NCR-2024-001")
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'investigation' | 'resolution_proposed' | 'approved' | 'closed';
  raisedDate: Date;
  raisedBy: string;                          // User email
  lotNumber?: string;                        // Related lot number
  inspectionPointRef?: string;               // Related inspection point reference
  rootCause?: string;
  proposedResolution?: string;
  approvedResolution?: string;
  resolvedBy?: string;                       // User email
  resolvedDate?: Date;
  closedDate?: Date;
  closedBy?: string;                         // User email
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

export const NCRSeverityEnum = z.enum(['minor', 'major', 'critical']);
export const NCRStatusEnum = z.enum(['open', 'investigation', 'resolution_proposed', 'approved', 'closed']);

export const NCRNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'NCR number is required'),
  description: z.string().min(1, 'Description is required'),
  severity: NCRSeverityEnum,
  status: NCRStatusEnum,
  raisedDate: z.coerce.date(),
  raisedBy: z.string().min(1, 'Raised by is required'),
  lotNumber: z.string().optional(),
  inspectionPointRef: z.string().optional(),
  rootCause: z.string().optional(),
  proposedResolution: z.string().optional(),
  approvedResolution: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolvedDate: z.coerce.date().optional(),
  closedDate: z.coerce.date().optional(),
  closedBy: z.string().optional(),
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

export const CreateNCRInputSchema = NCRNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  rootCause: true,
  proposedResolution: true,
  approvedResolution: true,
  resolvedBy: true,
  resolvedDate: true,
  closedDate: true,
  closedBy: true,
  notes: true,
  metadata: true,
});

export const UpdateNCRInputSchema = NCRNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const NCR_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT ncr_unique IF NOT EXISTS
  FOR (n:NCR) REQUIRE (n.projectId, n.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX ncr_project_id IF NOT EXISTS
  FOR (n:NCR) ON (n.projectId);
  
  CREATE INDEX ncr_status IF NOT EXISTS
  FOR (n:NCR) ON (n.status);
  
  CREATE INDEX ncr_severity IF NOT EXISTS
  FOR (n:NCR) ON (n.severity);
  
  CREATE INDEX ncr_raised_date IF NOT EXISTS
  FOR (n:NCR) ON (n.raisedDate);
  
  CREATE INDEX ncr_lot IF NOT EXISTS
  FOR (n:NCR) ON (n.lotNumber);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentNCROutput {
  ncrs: Array<{
    number: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    raisedDate: string;
    raisedBy: string;
    lotNumber?: string;
    rootCause?: string;
    proposedResolution?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const NCR_QUERIES = {
  getAllNCRs: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(n:NCR)
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
    ORDER BY n.raisedDate DESC
  `,
  
  getNCRDetail: `
    MATCH (n:NCR {projectId: $projectId, number: $ncrNumber})
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    OPTIONAL MATCH (n)-[:RELATED_TO]->(l:Lot)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (n)-[:RELATED_TO]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    OPTIONAL MATCH (n)<-[:RELATED_TO]-(doc:Document)
    WHERE doc.isDeleted IS NULL OR doc.isDeleted = false
    OPTIONAL MATCH (n)<-[:RELATED_TO]-(photo:Photo)
    WHERE photo.isDeleted IS NULL OR photo.isDeleted = false
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr, 
           l, ip, 
           collect(DISTINCT doc) as documents,
           collect(DISTINCT photo) as photos
  `,
  
  getOpenNCRs: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(n:NCR)
    WHERE n.status IN ['open', 'investigation', 'resolution_proposed']
      AND (n.isDeleted IS NULL OR n.isDeleted = false)
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
    ORDER BY n.severity DESC, n.raisedDate ASC
  `,
  
  getNCRsByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:RELATED_TO]-(n:NCR)
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
    ORDER BY n.raisedDate DESC
  `,
  
  createNCR: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (n:NCR)
    SET n = $properties
    SET n.projectId = $projectId
    SET n.createdAt = datetime()
    SET n.updatedAt = datetime()
    SET n.status = coalesce(n.status, 'open')
    CREATE (n)-[:BELONGS_TO_PROJECT]->(p)
    WITH n
    OPTIONAL MATCH (l:Lot {projectId: $projectId, number: n.lotNumber})
    FOREACH (_ IN CASE WHEN l IS NOT NULL THEN [1] ELSE [] END |
      CREATE (n)-[:RELATED_TO]->(l)
      CREATE (l)-[:HAS_NCR]->(n)
    )
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
  `,
  
  updateNCR: `
    MATCH (n:NCR {projectId: $projectId, number: $ncrNumber})
    SET n += $properties
    SET n.updatedAt = datetime()
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
  `,
  
  resolveNCR: `
    MATCH (n:NCR {projectId: $projectId, number: $ncrNumber})
    SET n.status = 'approved'
    SET n.approvedResolution = $approvedResolution
    SET n.resolvedBy = $userEmail
    SET n.resolvedDate = datetime()
    SET n.updatedAt = datetime()
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
  `,
  
  closeNCR: `
    MATCH (n:NCR {projectId: $projectId, number: $ncrNumber})
    SET n.status = 'closed'
    SET n.closedDate = datetime()
    SET n.closedBy = $userEmail
    SET n.updatedAt = datetime()
    RETURN n {
      .*,
      raisedDate: toString(n.raisedDate),
      resolvedDate: toString(n.resolvedDate),
      closedDate: toString(n.closedDate),
      createdAt: toString(n.createdAt),
      updatedAt: toString(n.updatedAt)
    } as ncr
  `,
  
  deleteNCR: `
    MATCH (n:NCR {projectId: $projectId, number: $ncrNumber})
    SET n.isDeleted = true
    SET n.deletedAt = datetime()
    SET n.deletedBy = $userId
    SET n.updatedAt = datetime()
    RETURN n
  `,
  
  getNCRStatistics: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(n:NCR)
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    RETURN 
      count(n) as totalNCRs,
      count(CASE WHEN n.status = 'open' THEN 1 END) as openNCRs,
      count(CASE WHEN n.status = 'investigation' THEN 1 END) as investigationNCRs,
      count(CASE WHEN n.status = 'resolution_proposed' THEN 1 END) as proposedNCRs,
      count(CASE WHEN n.status = 'approved' THEN 1 END) as approvedNCRs,
      count(CASE WHEN n.status = 'closed' THEN 1 END) as closedNCRs,
      count(CASE WHEN n.severity = 'critical' THEN 1 END) as criticalNCRs,
      count(CASE WHEN n.severity = 'major' THEN 1 END) as majorNCRs,
      count(CASE WHEN n.severity = 'minor' THEN 1 END) as minorNCRs
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const NCR_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every NCR belongs to exactly one project'
    },
    { 
      type: 'RELATED_TO', 
      target: 'Lot', 
      cardinality: '0..1',
      description: 'NCR may be related to a lot'
    },
    { 
      type: 'RELATED_TO', 
      target: 'InspectionPoint', 
      cardinality: '0..1',
      description: 'NCR may be related to an inspection point'
    },
    { 
      type: 'REPORTED_BY', 
      target: 'User', 
      cardinality: '1',
      description: 'NCR reported by user'
    },
    { 
      type: 'RESOLVED_BY', 
      target: 'User', 
      cardinality: '0..1',
      description: 'NCR resolved by user'
    },
  ],
  incoming: [
    { 
      type: 'HAS_NCR', 
      source: 'Lot', 
      cardinality: '1',
      description: 'Lot has this NCR'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Photo', 
      cardinality: '0..*',
      description: 'Photos may be related to NCR'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Document', 
      cardinality: '0..*',
      description: 'Documents may be related to NCR'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type NCRSeverity = z.infer<typeof NCRSeverityEnum>;
export type NCRStatus = z.infer<typeof NCRStatusEnum>;
export type CreateNCRInput = z.infer<typeof CreateNCRInputSchema>;
export type UpdateNCRInput = z.infer<typeof UpdateNCRInputSchema>;
