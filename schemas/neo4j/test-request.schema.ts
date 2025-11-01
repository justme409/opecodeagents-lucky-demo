import { z } from 'zod';

/**
 * TEST REQUEST SCHEMA
 * 
 * Requests for laboratory testing of materials and samples.
 * Links to lots, materials, samples, and test methods.
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface TestRequestNode {
  id: string;
  number: string;
  testType: string;
  status: 'requested' | 'in_progress' | 'completed' | 'approved' | 'failed';
  requestedDate: Date;
  requestedBy: string;
  dueDate?: Date;
  completedDate?: Date;
  lotId?: string;
  materialId?: string;
  sampleId?: string;
  testMethodId?: string;
  results?: Record<string, any>;
  passed?: boolean;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const TestRequestStatusEnum = z.enum(['requested', 'in_progress', 'completed', 'approved', 'failed']);

export const TestRequestNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  testType: z.string().min(1),
  status: TestRequestStatusEnum,
  requestedDate: z.coerce.date(),
  requestedBy: z.string().uuid(),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  lotId: z.string().uuid().optional(),
  materialId: z.string().uuid().optional(),
  sampleId: z.string().uuid().optional(),
  testMethodId: z.string().uuid().optional(),
  results: z.record(z.any()).optional(),
  passed: z.boolean().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateTestRequestInputSchema = TestRequestNodeSchema.omit({
  id: true,
  number: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  status: true,
  requestedDate: true,
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const TEST_REQUEST_CONSTRAINTS = `
  CREATE CONSTRAINT test_request_id_unique IF NOT EXISTS
  FOR (t:TestRequest) REQUIRE t.id IS UNIQUE;
  
  CREATE CONSTRAINT test_request_number_unique IF NOT EXISTS
  FOR (t:TestRequest) REQUIRE t.number IS UNIQUE;
  
  CREATE INDEX test_request_status IF NOT EXISTS
  FOR (t:TestRequest) ON (t.status);
  
  CREATE INDEX test_request_type IF NOT EXISTS
  FOR (t:TestRequest) ON (t.testType);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const TEST_REQUEST_QUERIES = {
  getAllTests: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(t:TestRequest)
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    RETURN t, l
    ORDER BY t.number DESC
  `,
  
  getTestDetail: `
    MATCH (t:TestRequest {id: $testId})
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    OPTIONAL MATCH (t)-[:FOR_LOT]->(l:Lot)
    OPTIONAL MATCH (t)-[:TESTS_MATERIAL]->(m:Material)
    OPTIONAL MATCH (t)-[:USES_SAMPLE]->(s:Sample)
    OPTIONAL MATCH (t)-[:FOLLOWS_METHOD]->(tm:TestMethod)
    RETURN t, l, m, s, tm
  `,
  
  getTestsByLot: `
    MATCH (l:Lot {id: $lotId})<-[:FOR_LOT]-(t:TestRequest)
    WHERE t.isDeleted IS NULL OR t.isDeleted = false
    RETURN t
    ORDER BY t.requestedDate DESC
  `,
  
  getPendingTests: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:Lot)<-[:FOR_LOT]-(t:TestRequest)
    WHERE t.status IN ['requested', 'in_progress']
      AND (t.isDeleted IS NULL OR t.isDeleted = false)
    RETURN t, l
    ORDER BY t.dueDate, t.requestedDate
  `,
  
  createTest: `
    CREATE (t:TestRequest $properties)
    SET t.id = randomUUID()
    SET t.number = 'TEST-' + toString(toInteger(rand() * 10000))
    SET t.createdAt = datetime()
    SET t.updatedAt = datetime()
    SET t.status = coalesce(t.status, 'requested')
    SET t.requestedDate = coalesce(t.requestedDate, datetime())
    WITH t
    MATCH (l:Lot {id: $lotId})
    CREATE (t)-[:FOR_LOT]->(l)
    CREATE (l)-[:HAS_TEST]->(t)
    RETURN t
  `,
  
  recordResults: `
    MATCH (t:TestRequest {id: $testId})
    SET t.results = $results
    SET t.passed = $passed
    SET t.status = 'completed'
    SET t.completedDate = datetime()
    SET t.updatedAt = datetime()
    RETURN t
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const TEST_REQUEST_RELATIONSHIPS = {
  outgoing: [
    { type: 'FOR_LOT', target: 'Lot', cardinality: '0..1' },
    { type: 'TESTS_MATERIAL', target: 'Material', cardinality: '0..1' },
    { type: 'USES_SAMPLE', target: 'Sample', cardinality: '0..1' },
    { type: 'FOLLOWS_METHOD', target: 'TestMethod', cardinality: '0..1' },
  ],
  incoming: [
    { type: 'HAS_TEST', source: 'Lot', cardinality: '1' },
  ],
};

export type TestRequestStatus = z.infer<typeof TestRequestStatusEnum>;
export type CreateTestRequestInput = z.infer<typeof CreateTestRequestInputSchema>;

