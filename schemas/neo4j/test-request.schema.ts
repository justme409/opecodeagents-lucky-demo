import { z } from 'zod';

/**
 * TEST REQUEST SCHEMA
 * 
 * Requests for laboratory testing of materials and samples.
 * Links to lots, materials, samples, and test methods.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface TestRequestNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // Test request number (REQUIRED, e.g., "TR-2024-001")
  testType: string;
  status: 'requested' | 'in_progress' | 'completed' | 'approved' | 'failed';
  requestedDate: Date;
  requestedBy: string;                       // User email
  dueDate?: Date;
  completedDate?: Date;
  lotNumber?: string;                        // Related lot number
  materialCode?: string;                     // Related material code
  sampleNumber?: string;                     // Related sample number
  testMethodCode?: string;                   // Test method code
  results?: Record<string, any>;
  passed?: boolean;
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

export const TestRequestStatusEnum = z.enum(['requested', 'in_progress', 'completed', 'approved', 'failed']);

export const TestRequestNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Test request number is required'),
  testType: z.string().min(1, 'Test type is required'),
  status: TestRequestStatusEnum,
  requestedDate: z.coerce.date(),
  requestedBy: z.string().min(1, 'Requested by is required'),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  lotNumber: z.string().optional(),
  materialCode: z.string().optional(),
  sampleNumber: z.string().optional(),
  testMethodCode: z.string().optional(),
  results: z.record(z.any()).optional(),
  passed: z.boolean().optional(),
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

export const CreateTestRequestInputSchema = TestRequestNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  dueDate: true,
  completedDate: true,
  results: true,
  passed: true,
  notes: true,
  metadata: true,
});

export const UpdateTestRequestInputSchema = TestRequestNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const TEST_REQUEST_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT test_request_unique IF NOT EXISTS
  FOR (tr:TestRequest) REQUIRE (tr.projectId, tr.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX test_request_project_id IF NOT EXISTS
  FOR (tr:TestRequest) ON (tr.projectId);
  
  CREATE INDEX test_request_status IF NOT EXISTS
  FOR (tr:TestRequest) ON (tr.status);
  
  CREATE INDEX test_request_lot IF NOT EXISTS
  FOR (tr:TestRequest) ON (tr.lotNumber);
  
  CREATE INDEX test_request_date IF NOT EXISTS
  FOR (tr:TestRequest) ON (tr.requestedDate);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentTestRequestOutput {
  testRequests: Array<{
    number: string;
    testType: string;
    requestedDate: string;
    requestedBy: string;
    lotNumber?: string;
    materialCode?: string;
    testMethodCode?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const TEST_REQUEST_QUERIES = {
  getAllTestRequests: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(tr:TestRequest)
    WHERE tr.isDeleted IS NULL OR tr.isDeleted = false
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
    ORDER BY tr.requestedDate DESC
  `,
  
  getTestRequestDetail: `
    MATCH (tr:TestRequest {projectId: $projectId, number: $testRequestNumber})
    WHERE tr.isDeleted IS NULL OR tr.isDeleted = false
    OPTIONAL MATCH (tr)-[:FOR_LOT]->(l:Lot)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (tr)-[:TESTS_MATERIAL]->(m:Material)
    WHERE m.isDeleted IS NULL OR m.isDeleted = false
    OPTIONAL MATCH (tr)-[:USES_SAMPLE]->(s:Sample)
    WHERE s.isDeleted IS NULL OR s.isDeleted = false
    OPTIONAL MATCH (tr)-[:FOLLOWS_METHOD]->(tm:TestMethod)
    WHERE tm.isDeleted IS NULL OR tm.isDeleted = false
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest, l, m, s, tm
  `,
  
  getPendingTestRequests: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(tr:TestRequest)
    WHERE tr.status IN ['requested', 'in_progress']
      AND (tr.isDeleted IS NULL OR tr.isDeleted = false)
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
    ORDER BY tr.dueDate ASC, tr.requestedDate ASC
  `,
  
  getTestRequestsByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:FOR_LOT]-(tr:TestRequest)
    WHERE tr.isDeleted IS NULL OR tr.isDeleted = false
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
    ORDER BY tr.requestedDate DESC
  `,
  
  createTestRequest: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (tr:TestRequest)
    SET tr = $properties
    SET tr.projectId = $projectId
    SET tr.createdAt = datetime()
    SET tr.updatedAt = datetime()
    SET tr.status = coalesce(tr.status, 'requested')
    CREATE (tr)-[:BELONGS_TO_PROJECT]->(p)
    WITH tr
    OPTIONAL MATCH (l:Lot {projectId: $projectId, number: tr.lotNumber})
    FOREACH (_ IN CASE WHEN l IS NOT NULL THEN [1] ELSE [] END |
      CREATE (tr)-[:FOR_LOT]->(l)
      CREATE (l)-[:HAS_TEST]->(tr)
    )
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
  `,
  
  updateTestRequest: `
    MATCH (tr:TestRequest {projectId: $projectId, number: $testRequestNumber})
    SET tr += $properties
    SET tr.updatedAt = datetime()
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
  `,
  
  completeTestRequest: `
    MATCH (tr:TestRequest {projectId: $projectId, number: $testRequestNumber})
    SET tr.status = 'completed'
    SET tr.completedDate = datetime()
    SET tr.results = $results
    SET tr.passed = $passed
    SET tr.updatedAt = datetime()
    RETURN tr {
      .*,
      requestedDate: toString(tr.requestedDate),
      dueDate: toString(tr.dueDate),
      completedDate: toString(tr.completedDate),
      createdAt: toString(tr.createdAt),
      updatedAt: toString(tr.updatedAt)
    } as testRequest
  `,
  
  deleteTestRequest: `
    MATCH (tr:TestRequest {projectId: $projectId, number: $testRequestNumber})
    SET tr.isDeleted = true
    SET tr.deletedAt = datetime()
    SET tr.deletedBy = $userId
    SET tr.updatedAt = datetime()
    RETURN tr
  `,
  
  getTestRequestStatistics: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(tr:TestRequest)
    WHERE tr.isDeleted IS NULL OR tr.isDeleted = false
    RETURN 
      count(tr) as totalTests,
      count(CASE WHEN tr.status = 'requested' THEN 1 END) as requestedTests,
      count(CASE WHEN tr.status = 'in_progress' THEN 1 END) as inProgressTests,
      count(CASE WHEN tr.status = 'completed' THEN 1 END) as completedTests,
      count(CASE WHEN tr.passed = true THEN 1 END) as passedTests,
      count(CASE WHEN tr.passed = false THEN 1 END) as failedTests
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const TEST_REQUEST_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every test request belongs to exactly one project'
    },
    { 
      type: 'FOR_LOT', 
      target: 'Lot', 
      cardinality: '0..1',
      description: 'Test request may be for a lot'
    },
    { 
      type: 'TESTS_MATERIAL', 
      target: 'Material', 
      cardinality: '0..1',
      description: 'Test request tests a material'
    },
    { 
      type: 'USES_SAMPLE', 
      target: 'Sample', 
      cardinality: '0..1',
      description: 'Test request uses a sample'
    },
    { 
      type: 'FOLLOWS_METHOD', 
      target: 'TestMethod', 
      cardinality: '0..1',
      description: 'Test request follows a test method'
    },
  ],
  incoming: [
    { 
      type: 'HAS_TEST', 
      source: 'Lot', 
      cardinality: '1',
      description: 'Lot has this test request'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type TestRequestStatus = z.infer<typeof TestRequestStatusEnum>;
export type CreateTestRequestInput = z.infer<typeof CreateTestRequestInputSchema>;
export type UpdateTestRequestInput = z.infer<typeof UpdateTestRequestInputSchema>;
