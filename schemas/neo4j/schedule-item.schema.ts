import { z } from 'zod';

/**
 * SCHEDULE ITEM SCHEMA
 * 
 * Contract schedule items (Bill of Quantities).
 * Agent extracts from contract schedule documents.
 */

export interface ScheduleItemNode {
  id: string;
  number: string;
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
}

export const ScheduleItemNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
  category: z.string().optional(),
  workType: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateScheduleItemInputSchema = ScheduleItemNodeSchema.omit({
  id: true,
  amount: true,
  createdAt: true,
  updatedAt: true,
});

export const SCHEDULE_ITEM_CONSTRAINTS = `
  CREATE CONSTRAINT schedule_item_id_unique IF NOT EXISTS
  FOR (si:ScheduleItem) REQUIRE si.id IS UNIQUE;
  
  CREATE CONSTRAINT schedule_item_number_unique IF NOT EXISTS
  FOR (si:ScheduleItem) REQUIRE si.number IS UNIQUE;
  
  CREATE INDEX schedule_item_category IF NOT EXISTS
  FOR (si:ScheduleItem) ON (si.category);
  
  CREATE INDEX schedule_item_work_type IF NOT EXISTS
  FOR (si:ScheduleItem) ON (si.workType);
`;

export const SCHEDULE_ITEM_QUERIES = {
  getAllItems: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(si:ScheduleItem)
    WHERE si.isDeleted IS NULL OR si.isDeleted = false
    RETURN si
    ORDER BY si.number
  `,
  
  getItemDetail: `
    MATCH (si:ScheduleItem {id: $itemId})
    WHERE si.isDeleted IS NULL OR si.isDeleted = false
    OPTIONAL MATCH (si)<-[:FOR_SCHEDULE_ITEM]-(qty:Quantity)
    RETURN si, collect(qty) as quantities
  `,
  
  getItemsByCategory: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(si:ScheduleItem)
    WHERE si.category = $category
      AND (si.isDeleted IS NULL OR si.isDeleted = false)
    RETURN si
    ORDER BY si.number
  `,
  
  createItem: `
    CREATE (si:ScheduleItem $properties)
    SET si.id = randomUUID()
    SET si.amount = si.quantity * si.rate
    SET si.createdAt = datetime()
    SET si.updatedAt = datetime()
    WITH si
    MATCH (p:Project {id: $projectId})
    CREATE (si)-[:BELONGS_TO_PROJECT]->(p)
    RETURN si
  `,
  
  updateItem: `
    MATCH (si:ScheduleItem {id: $itemId})
    SET si += $properties
    SET si.amount = si.quantity * si.rate
    SET si.updatedAt = datetime()
    RETURN si
  `,
};

export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemInputSchema>;

