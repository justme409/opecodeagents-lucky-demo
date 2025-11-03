import { z } from 'zod';

/**
 * SCHEDULE ITEM SCHEMA
 * 
 * Contract schedule items (Bill of Quantities).
 * Agent extracts from contract schedule documents.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ScheduleItemNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // Schedule item number (REQUIRED, e.g., "1.01")
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  category?: string;
  workType?: string;
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

export const ScheduleItemNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Schedule item number is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
  category: z.string().optional(),
  workType: z.string().optional(),
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

export const CreateScheduleItemInputSchema = ScheduleItemNodeSchema.omit({
  amount: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateScheduleItemInputSchema = ScheduleItemNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const SCHEDULE_ITEM_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT schedule_item_unique IF NOT EXISTS
  FOR (si:ScheduleItem) REQUIRE (si.projectId, si.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX schedule_item_project_id IF NOT EXISTS
  FOR (si:ScheduleItem) ON (si.projectId);
  
  CREATE INDEX schedule_item_category IF NOT EXISTS
  FOR (si:ScheduleItem) ON (si.category);
  
  CREATE INDEX schedule_item_work_type IF NOT EXISTS
  FOR (si:ScheduleItem) ON (si.workType);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentScheduleItemOutput {
  scheduleItems: Array<{
    number: string;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
    category?: string;
    workType?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const SCHEDULE_ITEM_QUERIES = {
  getAllScheduleItems: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(si:ScheduleItem)
    WHERE si.isDeleted IS NULL OR si.isDeleted = false
    RETURN si {
      .*,
      createdAt: toString(si.createdAt),
      updatedAt: toString(si.updatedAt)
    } as scheduleItem
    ORDER BY si.number
  `,
  
  getScheduleItemByNumber: `
    MATCH (si:ScheduleItem {projectId: $projectId, number: $number})
    WHERE si.isDeleted IS NULL OR si.isDeleted = false
    RETURN si {
      .*,
      createdAt: toString(si.createdAt),
      updatedAt: toString(si.updatedAt)
    } as scheduleItem
  `,
  
  createScheduleItem: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (si:ScheduleItem)
    SET si = $properties
    SET si.projectId = $projectId
    SET si.amount = si.quantity * si.rate
    SET si.createdAt = datetime()
    SET si.updatedAt = datetime()
    CREATE (si)-[:BELONGS_TO_PROJECT]->(p)
    RETURN si {
      .*,
      createdAt: toString(si.createdAt),
      updatedAt: toString(si.updatedAt)
    } as scheduleItem
  `,
  
  updateScheduleItem: `
    MATCH (si:ScheduleItem {projectId: $projectId, number: $number})
    SET si += $properties
    SET si.amount = si.quantity * si.rate
    SET si.updatedAt = datetime()
    RETURN si {
      .*,
      createdAt: toString(si.createdAt),
      updatedAt: toString(si.updatedAt)
    } as scheduleItem
  `,
  
  deleteScheduleItem: `
    MATCH (si:ScheduleItem {projectId: $projectId, number: $number})
    SET si.isDeleted = true
    SET si.deletedAt = datetime()
    SET si.deletedBy = $userId
    SET si.updatedAt = datetime()
    RETURN si
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const SCHEDULE_ITEM_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every schedule item belongs to exactly one project'
    },
  ],
  incoming: [
    { 
      type: 'FOR_SCHEDULE_ITEM', 
      source: 'Quantity', 
      cardinality: '0..*',
      description: 'Quantities link to schedule items'
    },
    { 
      type: 'FOR_SCHEDULE_ITEM', 
      source: 'ClaimItem', 
      cardinality: '0..*',
      description: 'Claim items link to schedule items'
    },
    { 
      type: 'AFFECTS', 
      source: 'Variation', 
      cardinality: '0..*',
      description: 'Variations affect schedule items'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemInputSchema>;
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemInputSchema>;
