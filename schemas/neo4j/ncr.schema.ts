import { z } from 'zod';

/**
 * NCR (NON-CONFORMANCE REPORT) SCHEMA
 * 
 * Records quality issues, defects, and non-conformances.
 * Tracks resolution and approval workflow.
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface NCRNode {
  id: string;
  number: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'investigation' | 'resolution_proposed' | 'approved' | 'closed';
  raisedDate: Date;
  raisedBy: string;
  lotId?: string;
  inspectionPointId?: string;
  rootCause?: string;
  proposedResolution?: string;
  approvedResolution?: string;
  closedDate?: Date;
  closedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const NCRSeverityEnum = z.enum(['minor', 'major', 'critical']);
export const NCRStatusEnum = z.enum(['open', 'investigation', 'resolution_proposed', 'approved', 'closed']);

export const NCRNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  description: z.string().min(1),
  severity: NCRSeverityEnum,
  status: NCRStatusEnum,
  raisedDate: z.coerce.date(),
  raisedBy: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  inspectionPointId: z.string().uuid().optional(),
  rootCause: z.string().optional(),
  proposedResolution: z.string().optional(),
  approvedResolution: z.string().optional(),
  closedDate: z.coerce.date().optional(),
  closedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateNCRInputSchema = NCRNodeSchema.omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  status: true,
  raisedDate: true,
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const NCR_CONSTRAINTS = `
  CREATE CONSTRAINT ncr_id_unique IF NOT EXISTS
  FOR (n:NCR) REQUIRE n.id IS UNIQUE;
  
  CREATE CONSTRAINT ncr_number_unique IF NOT EXISTS
  FOR (n:NCR) REQUIRE n.number IS UNIQUE;
  
  CREATE INDEX ncr_status IF NOT EXISTS
  FOR (n:NCR) ON (n.status);
  
  CREATE INDEX ncr_severity IF NOT EXISTS
  FOR (n:NCR) ON (n.severity);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const NCR_QUERIES = {
  getAllNCRs: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:RELATED_TO]-(n:NCR)
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    RETURN n, l
    ORDER BY n.number DESC
  `,
  
  getNCRDetail: `
    MATCH (n:NCR {id: $ncrId})
    WHERE n.isDeleted IS NULL OR n.isDeleted = false
    OPTIONAL MATCH (n)-[:RELATED_TO]->(l:Lot)
    OPTIONAL MATCH (n)-[:RELATED_TO]->(ip:InspectionPoint)
    OPTIONAL MATCH (n)<-[:RELATED_TO]-(photo:Photo)
    RETURN n, l, ip, collect(photo) as photos
  `,
  
  getOpenNCRs: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:RELATED_TO]-(n:NCR)
    WHERE n.status <> 'closed'
      AND (n.isDeleted IS NULL OR n.isDeleted = false)
    RETURN n, l
    ORDER BY n.severity DESC, n.raisedDate
  `,
  
  createNCR: `
    CREATE (n:NCR $properties)
    SET n.id = randomUUID()
    SET n.number = 'NCR-' + toString(toInteger(rand() * 10000))
    SET n.createdAt = datetime()
    SET n.updatedAt = datetime()
    SET n.status = coalesce(n.status, 'open')
    SET n.raisedDate = coalesce(n.raisedDate, datetime())
    WITH n
    MATCH (l:Lot {id: $lotId})
    CREATE (n)-[:RELATED_TO]->(l)
    CREATE (l)-[:HAS_NCR]->(n)
    RETURN n
  `,
  
  updateNCR: `
    MATCH (n:NCR {id: $ncrId})
    SET n += $properties
    SET n.updatedAt = datetime()
    RETURN n
  `,
  
  closeNCR: `
    MATCH (n:NCR {id: $ncrId})
    SET n.status = 'closed'
    SET n.closedDate = datetime()
    SET n.closedBy = $userId
    SET n.updatedAt = datetime()
    RETURN n
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const NCR_RELATIONSHIPS = {
  outgoing: [
    { type: 'RELATED_TO', target: 'Lot', cardinality: '0..1' },
    { type: 'RELATED_TO', target: 'InspectionPoint', cardinality: '0..1' },
    { type: 'REPORTED_BY', target: 'User', cardinality: '1' },
    { type: 'RESOLVED_BY', target: 'User', cardinality: '0..1' },
  ],
  incoming: [
    { type: 'HAS_NCR', source: 'Lot', cardinality: '1' },
    { type: 'RELATED_TO', source: 'Photo', cardinality: '0..*' },
    { type: 'RELATED_TO', source: 'Document', cardinality: '0..*' },
  ],
};

export type NCRSeverity = z.infer<typeof NCRSeverityEnum>;
export type NCRStatus = z.infer<typeof NCRStatusEnum>;
export type CreateNCRInput = z.infer<typeof CreateNCRInputSchema>;

