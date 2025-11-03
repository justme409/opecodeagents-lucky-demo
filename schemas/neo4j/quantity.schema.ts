import { z } from 'zod';

/**
 * QUANTITY SCHEMA
 * 
 * Links lots to schedule items with quantities for progress claims.
 * Tracks completion percentage and status.
 * 
 * Primary Key: (projectId, lotNumber, scheduleItemNumber)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface QuantityNode {
  projectId: string;                         // Project ID (REQUIRED)
  lotNumber: string;                         // Lot number (REQUIRED)
  scheduleItemNumber: string;                // Schedule item number (REQUIRED)
  quantity: number;
  unit: string;
  percentComplete: number;
  status: 'pending' | 'in_progress' | 'completed';
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

export const QuantityStatusEnum = z.enum(['pending', 'in_progress', 'completed']);

export const QuantityNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  scheduleItemNumber: z.string().min(1, 'Schedule item number is required'),
  quantity: z.number(),
  unit: z.string().min(1, 'Unit is required'),
  percentComplete: z.number().min(0).max(100),
  status: QuantityStatusEnum,
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

export const CreateQuantityInputSchema = QuantityNodeSchema.omit({
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
  notes: true,
  metadata: true,
});

export const UpdateQuantityInputSchema = QuantityNodeSchema.partial().required({ 
  projectId: true, 
  lotNumber: true,
  scheduleItemNumber: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const QUANTITY_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT quantity_unique IF NOT EXISTS
  FOR (q:Quantity) REQUIRE (q.projectId, q.lotNumber, q.scheduleItemNumber) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX quantity_project_id IF NOT EXISTS
  FOR (q:Quantity) ON (q.projectId);
  
  CREATE INDEX quantity_lot IF NOT EXISTS
  FOR (q:Quantity) ON (q.lotNumber);
  
  CREATE INDEX quantity_schedule_item IF NOT EXISTS
  FOR (q:Quantity) ON (q.scheduleItemNumber);
  
  CREATE INDEX quantity_status IF NOT EXISTS
  FOR (q:Quantity) ON (q.status);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const QUANTITY_QUERIES = {
  getAllQuantities: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(q:Quantity)
    WHERE q.isDeleted IS NULL OR q.isDeleted = false
    RETURN q {
      .*,
      createdAt: toString(q.createdAt),
      updatedAt: toString(q.updatedAt)
    } as quantity
    ORDER BY q.lotNumber, q.scheduleItemNumber
  `,
  
  getQuantitiesByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:HAS_QUANTITY]-(q:Quantity)
    WHERE q.isDeleted IS NULL OR q.isDeleted = false
    RETURN q {
      .*,
      createdAt: toString(q.createdAt),
      updatedAt: toString(q.updatedAt)
    } as quantity
    ORDER BY q.scheduleItemNumber
  `,
  
  createQuantity: `
    MATCH (p:Project {projectId: $projectId})
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})
    MATCH (si:ScheduleItem {projectId: $projectId, number: $scheduleItemNumber})
    CREATE (q:Quantity)
    SET q = $properties
    SET q.projectId = $projectId
    SET q.lotNumber = $lotNumber
    SET q.scheduleItemNumber = $scheduleItemNumber
    SET q.createdAt = datetime()
    SET q.updatedAt = datetime()
    SET q.status = coalesce(q.status, 'pending')
    SET q.percentComplete = coalesce(q.percentComplete, 0)
    CREATE (q)-[:BELONGS_TO_PROJECT]->(p)
    CREATE (l)-[:HAS_QUANTITY]->(q)
    CREATE (q)-[:FOR_SCHEDULE_ITEM]->(si)
    RETURN q {
      .*,
      createdAt: toString(q.createdAt),
      updatedAt: toString(q.updatedAt)
    } as quantity
  `,
  
  updateQuantity: `
    MATCH (q:Quantity {projectId: $projectId, lotNumber: $lotNumber, scheduleItemNumber: $scheduleItemNumber})
    SET q += $properties
    SET q.updatedAt = datetime()
    RETURN q {
      .*,
      createdAt: toString(q.createdAt),
      updatedAt: toString(q.updatedAt)
    } as quantity
  `,
  
  deleteQuantity: `
    MATCH (q:Quantity {projectId: $projectId, lotNumber: $lotNumber, scheduleItemNumber: $scheduleItemNumber})
    SET q.isDeleted = true
    SET q.deletedAt = datetime()
    SET q.deletedBy = $userId
    SET q.updatedAt = datetime()
    RETURN q
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const QUANTITY_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every quantity belongs to exactly one project'
    },
    { 
      type: 'FOR_SCHEDULE_ITEM', 
      target: 'ScheduleItem', 
      cardinality: '1',
      description: 'Quantity for schedule item'
    },
  ],
  incoming: [
    { 
      type: 'HAS_QUANTITY', 
      source: 'Lot', 
      cardinality: '1',
      description: 'Lot has this quantity'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type QuantityStatus = z.infer<typeof QuantityStatusEnum>;
export type CreateQuantityInput = z.infer<typeof CreateQuantityInputSchema>;
export type UpdateQuantityInput = z.infer<typeof UpdateQuantityInputSchema>;
