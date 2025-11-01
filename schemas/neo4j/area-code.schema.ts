import { z } from 'zod';

/**
 * AREA CODE SCHEMA
 * 
 * Reference data for area codes (minimal schema).
 * Agent extracts from drawings.
 */

export interface AreaCodeNode {
  id: string;
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const AreaCodeNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AREA_CODE_CONSTRAINTS = `
  CREATE CONSTRAINT area_code_id_unique IF NOT EXISTS
  FOR (ac:AreaCode) REQUIRE ac.id IS UNIQUE;
  
  CREATE CONSTRAINT area_code_code_unique IF NOT EXISTS
  FOR (ac:AreaCode) REQUIRE ac.code IS UNIQUE;
`;

export const AREA_CODE_QUERIES = {
  getAllAreaCodes: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(ac:AreaCode)
    WHERE ac.isDeleted IS NULL OR ac.isDeleted = false
    RETURN ac
    ORDER BY ac.code
  `,
  
  createAreaCode: `
    CREATE (ac:AreaCode $properties)
    SET ac.id = randomUUID()
    SET ac.createdAt = datetime()
    SET ac.updatedAt = datetime()
    WITH ac
    MATCH (p:Project {id: $projectId})
    CREATE (ac)-[:BELONGS_TO_PROJECT]->(p)
    RETURN ac
  `,
};

