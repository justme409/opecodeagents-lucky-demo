import { z } from 'zod';

/**
 * ITP INSTANCE SCHEMA
 * 
 * Lot-specific instance of an ITP Template. When a lot is created,
 * ITP instances are generated from templates and linked to the lot.
 * 
 * Agent generates ITP instances by:
 * - Creating instance from approved template
 * - Copying inspection points to instance
 * - Linking to specific lot
 * - Setting up hold points and test requirements
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface ITPInstanceNode {
  id: string;
  templateId: string;
  lotId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  startDate?: Date;
  completedDate?: Date;
  approvedDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ITPInstanceRelationships {
  instanceOf: string;            // ITP Template ID
  forLot: string;                // Lot ID
  hasPoints?: string[];          // Inspection Point IDs (instance-specific)
  approvedBy?: string[];         // User IDs
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const ITPInstanceStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'approved']);

export const ITPInstanceNodeSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  lotId: z.string().uuid(),
  status: ITPInstanceStatusEnum,
  startDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const CreateITPInstanceInputSchema = ITPInstanceNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
}).partial({
  status: true,
  startDate: true,
  completedDate: true,
  approvedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateITPInstanceInputSchema = ITPInstanceNodeSchema.partial().required({ id: true });

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const ITP_INSTANCE_CONSTRAINTS = `
  CREATE CONSTRAINT itp_instance_id_unique IF NOT EXISTS
  FOR (i:ITP_Instance) REQUIRE i.id IS UNIQUE;
  
  CREATE INDEX itp_instance_template IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.templateId);
  
  CREATE INDEX itp_instance_lot IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.lotId);
  
  CREATE INDEX itp_instance_status IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.status);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentITPInstanceOutput {
  instances: Array<{
    templateDocNo: string;
    lotNumber: string;
    notes?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const ITP_INSTANCE_QUERIES = {
  getAllInstances: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i, t, l
    ORDER BY l.number, t.docNo
  `,
  
  getInProgressInstances: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.status = 'in_progress'
      AND (i.isDeleted IS NULL OR i.isDeleted = false)
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i, t, l
    ORDER BY l.number, t.docNo
  `,
  
  getInstanceDetail: `
    MATCH (i:ITP_Instance {id: $instanceId})
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    MATCH (i)-[:FOR_LOT]->(l:Lot)
    OPTIONAL MATCH (i)-[:HAS_POINT]->(ip:InspectionPoint)
    RETURN i, t, l, collect(ip) as inspectionPoints
    ORDER BY ip.sequence
  `,
  
  getInstancesByLot: `
    MATCH (l:Lot {id: $lotId})<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i, t
    ORDER BY t.docNo
  `,
  
  createInstance: `
    CREATE (i:ITP_Instance $properties)
    SET i.id = randomUUID()
    SET i.createdAt = datetime()
    SET i.updatedAt = datetime()
    SET i.status = coalesce(i.status, 'pending')
    WITH i
    MATCH (t:ITP_Template {id: $templateId})
    MATCH (l:Lot {id: $lotId})
    CREATE (i)-[:INSTANCE_OF]->(t)
    CREATE (i)-[:FOR_LOT]->(l)
    CREATE (l)-[:IMPLEMENTS]->(i)
    RETURN i
  `,
  
  updateInstance: `
    MATCH (i:ITP_Instance {id: $instanceId})
    SET i += $properties
    SET i.updatedAt = datetime()
    RETURN i
  `,
  
  completeInstance: `
    MATCH (i:ITP_Instance {id: $instanceId})
    SET i.status = 'completed'
    SET i.completedDate = datetime()
    SET i.updatedAt = datetime()
    RETURN i
  `,
  
  deleteInstance: `
    MATCH (i:ITP_Instance {id: $instanceId})
    SET i.isDeleted = true
    SET i.deletedAt = datetime()
    SET i.updatedAt = datetime()
    RETURN i
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const ITP_INSTANCE_RELATIONSHIPS = {
  outgoing: [
    { type: 'INSTANCE_OF', target: 'ITP_Template', cardinality: '1' },
    { type: 'FOR_LOT', target: 'Lot', cardinality: '1' },
    { type: 'HAS_POINT', target: 'InspectionPoint', cardinality: '0..*' },
    { type: 'APPROVED_BY', target: 'User', cardinality: '0..*' },
  ],
  incoming: [
    { type: 'IMPLEMENTS', source: 'Lot', cardinality: '1' },
  ],
};

export type ITPInstanceStatus = z.infer<typeof ITPInstanceStatusEnum>;
export type CreateITPInstanceInput = z.infer<typeof CreateITPInstanceInputSchema>;
export type UpdateITPInstanceInput = z.infer<typeof UpdateITPInstanceInputSchema>;

