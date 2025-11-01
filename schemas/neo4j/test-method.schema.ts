import { z } from 'zod';

/**
 * TEST METHOD SCHEMA
 * 
 * Standardized test methods and procedures (AS, ASTM, etc.).
 * Agent extracts from specifications and standards.
 */

export interface TestMethodNode {
  id: string;
  code: string;
  name: string;
  standard: string;
  procedure: string;
  acceptanceCriteria?: string;
  frequency?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const TestMethodNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  standard: z.string().min(1),
  procedure: z.string(),
  acceptanceCriteria: z.string().optional(),
  frequency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TEST_METHOD_CONSTRAINTS = `
  CREATE CONSTRAINT test_method_id_unique IF NOT EXISTS
  FOR (tm:TestMethod) REQUIRE tm.id IS UNIQUE;
  
  CREATE CONSTRAINT test_method_code_unique IF NOT EXISTS
  FOR (tm:TestMethod) REQUIRE tm.code IS UNIQUE;
  
  CREATE INDEX test_method_standard IF NOT EXISTS
  FOR (tm:TestMethod) ON (tm.standard);
`;

export const TEST_METHOD_QUERIES = {
  getAllMethods: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(tm:TestMethod)
    WHERE tm.isDeleted IS NULL OR tm.isDeleted = false
    RETURN tm
    ORDER BY tm.code
  `,
  
  getMethodByCode: `
    MATCH (tm:TestMethod {code: $code})
    WHERE tm.isDeleted IS NULL OR tm.isDeleted = false
    RETURN tm
  `,
  
  createMethod: `
    CREATE (tm:TestMethod $properties)
    SET tm.id = randomUUID()
    SET tm.createdAt = datetime()
    SET tm.updatedAt = datetime()
    WITH tm
    MATCH (p:Project {id: $projectId})
    CREATE (tm)-[:BELONGS_TO_PROJECT]->(p)
    RETURN tm
  `,
};

export type CreateTestMethodInput = z.infer<typeof TestMethodNodeSchema>;

