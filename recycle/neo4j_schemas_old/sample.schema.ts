import { z } from 'zod';

/**
 * SAMPLE SCHEMA
 * 
 * Physical samples taken from lots for testing.
 * Tracks sample location, date taken, and lab assignment.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface SampleNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // Sample number (REQUIRED, e.g., "S-2024-001")
  type: string;
  lotNumber: string;                         // Related lot number
  location: string;
  dateTaken: Date;
  takenBy: string;                           // User email
  labId?: string;
  status: 'collected' | 'in_transit' | 'at_lab' | 'tested' | 'disposed';
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

export const SampleStatusEnum = z.enum(['collected', 'in_transit', 'at_lab', 'tested', 'disposed']);

export const SampleNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Sample number is required'),
  type: z.string().min(1, 'Type is required'),
  lotNumber: z.string().min(1, 'Lot number is required'),
  location: z.string().min(1, 'Location is required'),
  dateTaken: z.coerce.date(),
  takenBy: z.string().min(1, 'Taken by is required'),
  labId: z.string().optional(),
  status: SampleStatusEnum,
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

export const CreateSampleInputSchema = SampleNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  notes: true,
  metadata: true,
});

export const UpdateSampleInputSchema = SampleNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const SAMPLE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT sample_unique IF NOT EXISTS
  FOR (s:Sample) REQUIRE (s.projectId, s.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX sample_project_id IF NOT EXISTS
  FOR (s:Sample) ON (s.projectId);
  
  CREATE INDEX sample_lot IF NOT EXISTS
  FOR (s:Sample) ON (s.lotNumber);
  
  CREATE INDEX sample_status IF NOT EXISTS
  FOR (s:Sample) ON (s.status);
  
  CREATE INDEX sample_date IF NOT EXISTS
  FOR (s:Sample) ON (s.dateTaken);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const SAMPLE_QUERIES = {
  getAllSamples: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(s:Sample)
    WHERE s.isDeleted IS NULL OR s.isDeleted = false
    RETURN s {
      .*,
      dateTaken: toString(s.dateTaken),
      createdAt: toString(s.createdAt),
      updatedAt: toString(s.updatedAt)
    } as sample
    ORDER BY s.dateTaken DESC
  `,
  
  getSamplesByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:FROM_LOT]-(s:Sample)
    WHERE s.isDeleted IS NULL OR s.isDeleted = false
    RETURN s {
      .*,
      dateTaken: toString(s.dateTaken),
      createdAt: toString(s.createdAt),
      updatedAt: toString(s.updatedAt)
    } as sample
    ORDER BY s.dateTaken DESC
  `,
  
  createSample: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (s:Sample)
    SET s = $properties
    SET s.projectId = $projectId
    SET s.createdAt = datetime()
    SET s.updatedAt = datetime()
    SET s.status = coalesce(s.status, 'collected')
    CREATE (s)-[:BELONGS_TO_PROJECT]->(p)
    WITH s
    MATCH (l:Lot {projectId: $projectId, number: s.lotNumber})
    CREATE (s)-[:FROM_LOT]->(l)
    RETURN s {
      .*,
      dateTaken: toString(s.dateTaken),
      createdAt: toString(s.createdAt),
      updatedAt: toString(s.updatedAt)
    } as sample
  `,
  
  updateSample: `
    MATCH (s:Sample {projectId: $projectId, number: $sampleNumber})
    SET s += $properties
    SET s.updatedAt = datetime()
    RETURN s {
      .*,
      dateTaken: toString(s.dateTaken),
      createdAt: toString(s.createdAt),
      updatedAt: toString(s.updatedAt)
    } as sample
  `,
  
  deleteSample: `
    MATCH (s:Sample {projectId: $projectId, number: $sampleNumber})
    SET s.isDeleted = true
    SET s.deletedAt = datetime()
    SET s.deletedBy = $userId
    SET s.updatedAt = datetime()
    RETURN s
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const SAMPLE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every sample belongs to exactly one project'
    },
    { 
      type: 'FROM_LOT', 
      target: 'Lot', 
      cardinality: '1',
      description: 'Sample taken from lot'
    },
  ],
  incoming: [
    { 
      type: 'USES_SAMPLE', 
      source: 'TestRequest', 
      cardinality: '0..*',
      description: 'Test requests use this sample'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type SampleStatus = z.infer<typeof SampleStatusEnum>;
export type CreateSampleInput = z.infer<typeof CreateSampleInputSchema>;
export type UpdateSampleInput = z.infer<typeof UpdateSampleInputSchema>;
