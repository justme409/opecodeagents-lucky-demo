import { z } from 'zod';

/**
 * WORK TYPE SCHEMA
 * 
 * Reference data for work types (minimal schema).
 * Agent extracts from specifications.
 */

export interface WorkTypeNode {
  id: string;
  code: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const WorkTypeNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const WORK_TYPE_CONSTRAINTS = `
  CREATE CONSTRAINT work_type_id_unique IF NOT EXISTS
  FOR (wt:WorkType) REQUIRE wt.id IS UNIQUE;
  
  CREATE CONSTRAINT work_type_code_unique IF NOT EXISTS
  FOR (wt:WorkType) REQUIRE wt.code IS UNIQUE;
`;

export const WORK_TYPE_QUERIES = {
  getAllWorkTypes: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(wt:WorkType)
    WHERE wt.isDeleted IS NULL OR wt.isDeleted = false
    RETURN wt
    ORDER BY wt.code
  `,
  
  createWorkType: `
    CREATE (wt:WorkType $properties)
    SET wt.id = randomUUID()
    SET wt.createdAt = datetime()
    SET wt.updatedAt = datetime()
    WITH wt
    MATCH (p:Project {id: $projectId})
    CREATE (wt)-[:BELONGS_TO_PROJECT]->(p)
    RETURN wt
  `,
};

