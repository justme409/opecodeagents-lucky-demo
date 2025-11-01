import { z } from 'zod';

/**
 * SAMPLE SCHEMA
 * 
 * Physical samples taken from lots for testing.
 * Tracks sample location, date taken, and lab assignment.
 */

export interface SampleNode {
  id: string;
  number: string;
  type: string;
  lotId: string;
  location: string;
  dateTaken: Date;
  takenBy: string;
  labId?: string;
  status: 'collected' | 'in_transit' | 'at_lab' | 'tested' | 'disposed';
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const SampleStatusEnum = z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']);

export const SampleNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  type: z.string().min(1),
  lotId: z.string().uuid(),
  location: z.string().min(1),
  dateTaken: z.coerce.date(),
  takenBy: z.string().uuid(),
  labId: z.string().uuid().optional(),
  status: SampleStatusEnum,
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SAMPLE_CONSTRAINTS = `
  CREATE CONSTRAINT sample_id_unique IF NOT EXISTS
  FOR (s:Sample) REQUIRE s.id IS UNIQUE;
  
  CREATE CONSTRAINT sample_number_unique IF NOT EXISTS
  FOR (s:Sample) REQUIRE s.number IS UNIQUE;
  
  CREATE INDEX sample_status IF NOT EXISTS
  FOR (s:Sample) ON (s.status);
  
  CREATE INDEX sample_lot IF NOT EXISTS
  FOR (s:Sample) ON (s.lotId);
`;

export const SAMPLE_QUERIES = {
  getAllSamples: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FROM_LOT]-(s:Sample)
    WHERE s.isDeleted IS NULL OR s.isDeleted = false
    RETURN s, l
    ORDER BY s.dateTaken DESC
  `,
  
  getSamplesByLot: `
    MATCH (l:Lot {id: $lotId})<-[:FROM_LOT]-(s:Sample)
    WHERE s.isDeleted IS NULL OR s.isDeleted = false
    RETURN s
    ORDER BY s.dateTaken DESC
  `,
  
  createSample: `
    CREATE (s:Sample $properties)
    SET s.id = randomUUID()
    SET s.number = 'SAMPLE-' + toString(toInteger(rand() * 10000))
    SET s.createdAt = datetime()
    SET s.updatedAt = datetime()
    SET s.status = coalesce(s.status, 'collected')
    WITH s
    MATCH (l:Lot {id: $lotId})
    CREATE (s)-[:FROM_LOT]->(l)
    RETURN s
  `,
};

export type SampleStatus = z.infer<typeof SampleStatusEnum>;

