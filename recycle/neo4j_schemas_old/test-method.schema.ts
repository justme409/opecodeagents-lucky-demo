import { z } from 'zod';

/**
 * TEST METHOD SCHEMA
 * 
 * Standardized test methods and procedures (AS, ASTM, etc.).
 * Agent extracts from specifications and standards.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface TestMethodNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Test method code (REQUIRED, e.g., "AS 1012.3.1")
  name: string;
  standard: string;
  procedure: string;
  acceptanceCriteria?: string;
  frequency?: string;
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

export const TestMethodNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Test method code is required'),
  name: z.string().min(1, 'Name is required'),
  standard: z.string().min(1, 'Standard is required'),
  procedure: z.string(),
  acceptanceCriteria: z.string().optional(),
  frequency: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateTestMethodInputSchema = TestMethodNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateTestMethodInputSchema = TestMethodNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const TEST_METHOD_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT test_method_unique IF NOT EXISTS
  FOR (tm:TestMethod) REQUIRE (tm.projectId, tm.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX test_method_project_id IF NOT EXISTS
  FOR (tm:TestMethod) ON (tm.projectId);
  
  CREATE INDEX test_method_standard IF NOT EXISTS
  FOR (tm:TestMethod) ON (tm.standard);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const TEST_METHOD_QUERIES = {
  getAllTestMethods: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(tm:TestMethod)
    WHERE tm.isDeleted IS NULL OR tm.isDeleted = false
    RETURN tm {
      .*,
      createdAt: toString(tm.createdAt),
      updatedAt: toString(tm.updatedAt)
    } as testMethod
    ORDER BY tm.code
  `,
  
  getTestMethodByCode: `
    MATCH (tm:TestMethod {projectId: $projectId, code: $code})
    WHERE tm.isDeleted IS NULL OR tm.isDeleted = false
    RETURN tm {
      .*,
      createdAt: toString(tm.createdAt),
      updatedAt: toString(tm.updatedAt)
    } as testMethod
  `,
  
  createTestMethod: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (tm:TestMethod)
    SET tm = $properties
    SET tm.projectId = $projectId
    SET tm.createdAt = datetime()
    SET tm.updatedAt = datetime()
    CREATE (tm)-[:BELONGS_TO_PROJECT]->(p)
    RETURN tm {
      .*,
      createdAt: toString(tm.createdAt),
      updatedAt: toString(tm.updatedAt)
    } as testMethod
  `,
  
  updateTestMethod: `
    MATCH (tm:TestMethod {projectId: $projectId, code: $code})
    SET tm += $properties
    SET tm.updatedAt = datetime()
    RETURN tm {
      .*,
      createdAt: toString(tm.createdAt),
      updatedAt: toString(tm.updatedAt)
    } as testMethod
  `,
  
  deleteTestMethod: `
    MATCH (tm:TestMethod {projectId: $projectId, code: $code})
    SET tm.isDeleted = true
    SET tm.deletedAt = datetime()
    SET tm.deletedBy = $userId
    SET tm.updatedAt = datetime()
    RETURN tm
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const TEST_METHOD_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every test method belongs to exactly one project'
    },
  ],
  incoming: [
    { 
      type: 'FOLLOWS_METHOD', 
      source: 'TestRequest', 
      cardinality: '0..*',
      description: 'Test requests follow this method'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateTestMethodInput = z.infer<typeof CreateTestMethodInputSchema>;
export type UpdateTestMethodInput = z.infer<typeof UpdateTestMethodInputSchema>;
