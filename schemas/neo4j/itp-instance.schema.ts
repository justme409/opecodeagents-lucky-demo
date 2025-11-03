import { z } from 'zod';

/**
 * ITP INSTANCE SCHEMA
 * 
 * Lot-specific instance of an ITP Template. When a lot is created,
 * ITP instances are generated from templates and linked to the lot.
 * 
 * Primary Key: (projectId, lotNumber, templateDocNo) - composite
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
  projectId: string;                // Project ID (REQUIRED)
  lotNumber: string;                // Lot number (REQUIRED)
  templateDocNo: string;            // ITP Template doc number (REQUIRED)
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  startDate?: Date;
  completedDate?: Date;
  approvedDate?: Date;
  approvedBy?: string;              // User email
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

export interface ITPInstanceRelationships {
  instanceOf: string;            // ITP Template docNo
  forLot: string;                // Lot number
  hasPoints?: string[];          // Inspection Point IDs (instance-specific)
  approvedBy?: string[];         // User emails
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const ITPInstanceStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'approved']);

export const ITPInstanceNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  templateDocNo: z.string().min(1, 'Template doc number is required'),
  status: ITPInstanceStatusEnum,
  startDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
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

export const CreateITPInstanceInputSchema = ITPInstanceNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  startDate: true,
  completedDate: true,
  approvedDate: true,
  approvedBy: true,
  notes: true,
  metadata: true,
});

export const UpdateITPInstanceInputSchema = ITPInstanceNodeSchema.partial().required({ 
  projectId: true, 
  lotNumber: true,
  templateDocNo: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const ITP_INSTANCE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT itp_instance_unique IF NOT EXISTS
  FOR (i:ITP_Instance) REQUIRE (i.projectId, i.lotNumber, i.templateDocNo) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX itp_instance_project_id IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.projectId);
  
  CREATE INDEX itp_instance_lot IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.lotNumber);
  
  CREATE INDEX itp_instance_template IF NOT EXISTS
  FOR (i:ITP_Instance) ON (i.templateDocNo);
  
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
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance, 
           t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template, 
           l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.number, t.docNo
  `,
  
  getInProgressInstances: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.status = 'in_progress'
      AND (i.isDeleted IS NULL OR i.isDeleted = false)
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance, 
           t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template, 
           l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot
    ORDER BY l.number, t.docNo
  `,
  
  getInstanceDetail: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    MATCH (i)-[:FOR_LOT]->(l:Lot)
    OPTIONAL MATCH (i)-[:HAS_POINT]->(ip:InspectionPoint)
    WHERE ip.isDeleted IS NULL OR ip.isDeleted = false
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance, 
           t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template, 
           l {
      .*,
      startDate: toString(l.startDate),
      conformedDate: toString(l.conformedDate),
      closedDate: toString(l.closedDate),
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as lot, 
           collect(ip ORDER BY ip.sequence) as inspectionPoints
  `,
  
  getInstancesByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:FOR_LOT]-(i:ITP_Instance)
    WHERE i.isDeleted IS NULL OR i.isDeleted = false
    OPTIONAL MATCH (i)-[:INSTANCE_OF]->(t:ITP_Template)
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance, 
           t {
      .*,
      revisionDate: toString(t.revisionDate),
      approvedDate: toString(t.approvedDate),
      createdAt: toString(t.createdAt),
      updatedAt: toString(t.updatedAt)
    } as template
    ORDER BY t.docNo
  `,
  
  createInstance: `
    MATCH (t:ITP_Template {projectId: $projectId, docNo: $templateDocNo})
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    CREATE (i:ITP_Instance)
    SET i = $properties
    SET i.projectId = $projectId
    SET i.lotNumber = $lotNumber
    SET i.templateDocNo = $templateDocNo
    SET i.createdAt = datetime()
    SET i.updatedAt = datetime()
    SET i.status = coalesce(i.status, 'pending')
    CREATE (i)-[:INSTANCE_OF]->(t)
    CREATE (i)-[:FOR_LOT]->(l)
    CREATE (l)-[:IMPLEMENTS]->(i)
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance
  `,
  
  updateInstance: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})
    SET i += $properties
    SET i.updatedAt = datetime()
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance
  `,
  
  completeInstance: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})
    SET i.status = 'completed'
    SET i.completedDate = datetime()
    SET i.updatedAt = datetime()
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance
  `,
  
  approveInstance: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})
    SET i.status = 'approved'
    SET i.approvedDate = datetime()
    SET i.approvedBy = $userEmail
    SET i.updatedAt = datetime()
    RETURN i {
      .*,
      startDate: toString(i.startDate),
      completedDate: toString(i.completedDate),
      approvedDate: toString(i.approvedDate),
      createdAt: toString(i.createdAt),
      updatedAt: toString(i.updatedAt)
    } as instance
  `,
  
  deleteInstance: `
    MATCH (i:ITP_Instance {projectId: $projectId, lotNumber: $lotNumber, templateDocNo: $templateDocNo})
    SET i.isDeleted = true
    SET i.deletedAt = datetime()
    SET i.deletedBy = $userId
    SET i.updatedAt = datetime()
    RETURN i
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const ITP_INSTANCE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'INSTANCE_OF', 
      target: 'ITP_Template', 
      cardinality: '1',
      description: 'Instance created from template'
    },
    { 
      type: 'FOR_LOT', 
      target: 'Lot', 
      cardinality: '1',
      description: 'Instance is for specific lot'
    },
    { 
      type: 'HAS_POINT', 
      target: 'InspectionPoint', 
      cardinality: '0..*',
      description: 'Instance has inspection points'
    },
    { 
      type: 'APPROVED_BY', 
      target: 'User', 
      cardinality: '0..*',
      description: 'Instance approved by users'
    },
  ],
  incoming: [
    { 
      type: 'IMPLEMENTS', 
      source: 'Lot', 
      cardinality: '1',
      description: 'Lot implements this instance'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ITPInstanceStatus = z.infer<typeof ITPInstanceStatusEnum>;
export type CreateITPInstanceInput = z.infer<typeof CreateITPInstanceInputSchema>;
export type UpdateITPInstanceInput = z.infer<typeof UpdateITPInstanceInputSchema>;
