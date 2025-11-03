import { z } from 'zod';

/**
 * AREA CODE SCHEMA
 * 
 * Reference data for area codes (minimal schema).
 * Agent extracts from drawings.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface AreaCodeNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Area code (REQUIRED, e.g., "MC01", "BR02")
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

export const AreaCodeNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Area code is required'),
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

export const CreateAreaCodeInputSchema = AreaCodeNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateAreaCodeInputSchema = AreaCodeNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const AREA_CODE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT area_code_unique IF NOT EXISTS
  FOR (ac:AreaCode) REQUIRE (ac.projectId, ac.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX area_code_project_id IF NOT EXISTS
  FOR (ac:AreaCode) ON (ac.projectId);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const AREA_CODE_QUERIES = {
  getAllAreaCodes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(ac:AreaCode)
    WHERE ac.isDeleted IS NULL OR ac.isDeleted = false
    RETURN ac {
      .*,
      createdAt: toString(ac.createdAt),
      updatedAt: toString(ac.updatedAt)
    } as areaCode
    ORDER BY ac.code
  `,
  
  createAreaCode: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (ac:AreaCode)
    SET ac = $properties
    SET ac.projectId = $projectId
    SET ac.createdAt = datetime()
    SET ac.updatedAt = datetime()
    CREATE (ac)-[:BELONGS_TO_PROJECT]->(p)
    RETURN ac {
      .*,
      createdAt: toString(ac.createdAt),
      updatedAt: toString(ac.updatedAt)
    } as areaCode
  `,
  
  updateAreaCode: `
    MATCH (ac:AreaCode {projectId: $projectId, code: $code})
    SET ac += $properties
    SET ac.updatedAt = datetime()
    RETURN ac {
      .*,
      createdAt: toString(ac.createdAt),
      updatedAt: toString(ac.updatedAt)
    } as areaCode
  `,
  
  deleteAreaCode: `
    MATCH (ac:AreaCode {projectId: $projectId, code: $code})
    SET ac.isDeleted = true
    SET ac.deletedAt = datetime()
    SET ac.deletedBy = $userId
    SET ac.updatedAt = datetime()
    RETURN ac
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const AREA_CODE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every area code belongs to exactly one project'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateAreaCodeInput = z.infer<typeof CreateAreaCodeInputSchema>;
export type UpdateAreaCodeInput = z.infer<typeof UpdateAreaCodeInputSchema>;
