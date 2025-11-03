import { z } from 'zod';

/**
 * WORK TYPE SCHEMA
 * 
 * Reference data for work types (minimal schema).
 * Agent extracts from specifications.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface WorkTypeNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Work type code (REQUIRED, e.g., "SG", "PV")
  description: string;
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

export const WorkTypeNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Work type code is required'),
  description: z.string().min(1, 'Description is required'),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateWorkTypeInputSchema = WorkTypeNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateWorkTypeInputSchema = WorkTypeNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const WORK_TYPE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT work_type_unique IF NOT EXISTS
  FOR (wt:WorkType) REQUIRE (wt.projectId, wt.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX work_type_project_id IF NOT EXISTS
  FOR (wt:WorkType) ON (wt.projectId);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const WORK_TYPE_QUERIES = {
  getAllWorkTypes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(wt:WorkType)
    WHERE wt.isDeleted IS NULL OR wt.isDeleted = false
    RETURN wt {
      .*,
      createdAt: toString(wt.createdAt),
      updatedAt: toString(wt.updatedAt)
    } as workType
    ORDER BY wt.code
  `,
  
  createWorkType: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (wt:WorkType)
    SET wt = $properties
    SET wt.projectId = $projectId
    SET wt.createdAt = datetime()
    SET wt.updatedAt = datetime()
    CREATE (wt)-[:BELONGS_TO_PROJECT]->(p)
    RETURN wt {
      .*,
      createdAt: toString(wt.createdAt),
      updatedAt: toString(wt.updatedAt)
    } as workType
  `,
  
  updateWorkType: `
    MATCH (wt:WorkType {projectId: $projectId, code: $code})
    SET wt += $properties
    SET wt.updatedAt = datetime()
    RETURN wt {
      .*,
      createdAt: toString(wt.createdAt),
      updatedAt: toString(wt.updatedAt)
    } as workType
  `,
  
  deleteWorkType: `
    MATCH (wt:WorkType {projectId: $projectId, code: $code})
    SET wt.isDeleted = true
    SET wt.deletedAt = datetime()
    SET wt.deletedBy = $userId
    SET wt.updatedAt = datetime()
    RETURN wt
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const WORK_TYPE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every work type belongs to exactly one project'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateWorkTypeInput = z.infer<typeof CreateWorkTypeInputSchema>;
export type UpdateWorkTypeInput = z.infer<typeof UpdateWorkTypeInputSchema>;
