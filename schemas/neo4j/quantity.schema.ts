import { z } from 'zod';

/**
 * QUANTITY SCHEMA
 * 
 * Links lots to schedule items with quantities for progress claims.
 * Tracks completion percentage and status.
 */

export interface QuantityNode {
  id: string;
  lotId: string;
  scheduleItemId: string;
  quantity: number;
  unit: string;
  percentComplete: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const QuantityStatusEnum = z.enum(['pending', 'in_progress', 'completed']);

export const QuantityNodeSchema = z.object({
  id: z.string().uuid(),
  lotId: z.string().uuid(),
  scheduleItemId: z.string().uuid(),
  quantity: z.number(),
  unit: z.string().min(1),
  percentComplete: z.number().min(0).max(100),
  status: QuantityStatusEnum,
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const QUANTITY_CONSTRAINTS = `
  CREATE CONSTRAINT quantity_id_unique IF NOT EXISTS
  FOR (q:Quantity) REQUIRE q.id IS UNIQUE;
  
  CREATE INDEX quantity_lot IF NOT EXISTS
  FOR (q:Quantity) ON (q.lotId);
  
  CREATE INDEX quantity_schedule_item IF NOT EXISTS
  FOR (q:Quantity) ON (q.scheduleItemId);
  
  CREATE INDEX quantity_status IF NOT EXISTS
  FOR (q:Quantity) ON (q.status);
`;

export const QUANTITY_QUERIES = {
  getQuantitiesByLot: `
    MATCH (l:Lot {id: $lotId})-[:HAS_QUANTITY]->(q:Quantity)
    WHERE q.isDeleted IS NULL OR q.isDeleted = false
    MATCH (q)-[:FOR_SCHEDULE_ITEM]->(si:ScheduleItem)
    RETURN q, si
    ORDER BY si.number
  `,
  
  getQuantitiesByScheduleItem: `
    MATCH (si:ScheduleItem {id: $scheduleItemId})<-[:FOR_SCHEDULE_ITEM]-(q:Quantity)
    WHERE q.isDeleted IS NULL OR q.isDeleted = false
    MATCH (q)<-[:HAS_QUANTITY]-(l:Lot)
    RETURN q, l
    ORDER BY l.number
  `,
  
  createQuantity: `
    CREATE (q:Quantity $properties)
    SET q.id = randomUUID()
    SET q.createdAt = datetime()
    SET q.updatedAt = datetime()
    SET q.status = coalesce(q.status, 'pending')
    SET q.percentComplete = coalesce(q.percentComplete, 0)
    WITH q
    MATCH (l:Lot {id: $lotId})
    MATCH (si:ScheduleItem {id: $scheduleItemId})
    CREATE (l)-[:HAS_QUANTITY]->(q)
    CREATE (q)-[:FOR_SCHEDULE_ITEM]->(si)
    RETURN q
  `,
  
  updateQuantity: `
    MATCH (q:Quantity {id: $quantityId})
    SET q += $properties
    SET q.updatedAt = datetime()
    RETURN q
  `,
  
  getClaimableQuantities: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.status = 'conformed'
    MATCH (l)-[:HAS_QUANTITY]->(q:Quantity)-[:FOR_SCHEDULE_ITEM]->(si:ScheduleItem)
    WHERE q.percentComplete > 0
      AND (q.isDeleted IS NULL OR q.isDeleted = false)
    RETURN si, sum(q.quantity * q.percentComplete / 100) as claimableQuantity
    ORDER BY si.number
  `,
};

export type QuantityStatus = z.infer<typeof QuantityStatusEnum>;

