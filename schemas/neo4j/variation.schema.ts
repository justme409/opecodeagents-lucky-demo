import { z } from 'zod';

/**
 * VARIATION SCHEMA
 * 
 * Contract variations and change orders.
 * Tracks approval status and impacts on schedule items.
 */

export interface VariationNode {
  id: string;
  number: string;
  description: string;
  dateIdentified: Date;
  dateNotified?: Date;
  status: 'identified' | 'notified' | 'quoted' | 'approved' | 'rejected' | 'implemented';
  claimedValue: number;
  approvedValue?: number;
  approvedDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const VariationStatusEnum = z.enum(['identified', 'notified', 'quoted', 'approved', 'rejected', 'implemented']);

export const VariationNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  description: z.string().min(1),
  dateIdentified: z.coerce.date(),
  dateNotified: z.coerce.date().optional(),
  status: VariationStatusEnum,
  claimedValue: z.number(),
  approvedValue: z.number().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateVariationInputSchema = VariationNodeSchema.omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  status: true,
  dateIdentified: true,
  claimedValue: true,
});

export const VARIATION_CONSTRAINTS = `
  CREATE CONSTRAINT variation_id_unique IF NOT EXISTS
  FOR (v:Variation) REQUIRE v.id IS UNIQUE;
  
  CREATE CONSTRAINT variation_number_unique IF NOT EXISTS
  FOR (v:Variation) REQUIRE v.number IS UNIQUE;
  
  CREATE INDEX variation_status IF NOT EXISTS
  FOR (v:Variation) ON (v.status);
`;

export const VARIATION_QUERIES = {
  getAllVariations: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(v:Variation)
    WHERE v.isDeleted IS NULL OR v.isDeleted = false
    RETURN v
    ORDER BY v.number DESC
  `,
  
  getVariationDetail: `
    MATCH (v:Variation {id: $variationId})
    WHERE v.isDeleted IS NULL OR v.isDeleted = false
    OPTIONAL MATCH (v)-[:AFFECTS]->(si:ScheduleItem)
    RETURN v, collect(si) as affectedItems
  `,
  
  getPendingVariations: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(v:Variation)
    WHERE v.status IN ['identified', 'notified', 'quoted']
      AND (v.isDeleted IS NULL OR v.isDeleted = false)
    RETURN v
    ORDER BY v.dateIdentified
  `,
  
  createVariation: `
    CREATE (v:Variation $properties)
    SET v.id = randomUUID()
    SET v.number = 'VO-' + toString(toInteger(rand() * 1000))
    SET v.createdAt = datetime()
    SET v.updatedAt = datetime()
    SET v.status = coalesce(v.status, 'identified')
    SET v.dateIdentified = coalesce(v.dateIdentified, datetime())
    SET v.claimedValue = coalesce(v.claimedValue, 0)
    WITH v
    MATCH (p:Project {id: $projectId})
    CREATE (v)-[:BELONGS_TO_PROJECT]->(p)
    RETURN v
  `,
  
  approveVariation: `
    MATCH (v:Variation {id: $variationId})
    SET v.status = 'approved'
    SET v.approvedValue = $approvedValue
    SET v.approvedDate = datetime()
    SET v.updatedAt = datetime()
    RETURN v
  `,
  
  getVariationSummary: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(v:Variation)
    WHERE v.isDeleted IS NULL OR v.isDeleted = false
    RETURN 
      count(v) as totalVariations,
      sum(v.claimedValue) as totalClaimedValue,
      sum(CASE WHEN v.status = 'approved' THEN v.approvedValue ELSE 0 END) as totalApprovedValue,
      count(CASE WHEN v.status IN ['identified', 'notified', 'quoted'] THEN 1 END) as pendingVariations
  `,
};

export type VariationStatus = z.infer<typeof VariationStatusEnum>;
export type CreateVariationInput = z.infer<typeof CreateVariationInputSchema>;

