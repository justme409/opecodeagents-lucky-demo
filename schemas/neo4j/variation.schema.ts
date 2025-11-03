import { z } from 'zod';

/**
 * VARIATION SCHEMA
 * 
 * Contract variations and change orders.
 * Tracks approval status and impacts on schedule items.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface VariationNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // Variation number (REQUIRED, e.g., "VO-001")
  description: string;
  dateIdentified: Date;
  dateNotified?: Date;
  status: 'identified' | 'notified' | 'quoted' | 'approved' | 'rejected' | 'implemented';
  claimedValue: number;
  approvedValue?: number;
  approvedDate?: Date;
  approvedBy?: string;                       // User email
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

export const VariationStatusEnum = z.enum(['identified', 'notified', 'quoted', 'approved', 'rejected', 'implemented']);

export const VariationNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Variation number is required'),
  description: z.string().min(1, 'Description is required'),
  dateIdentified: z.coerce.date(),
  dateNotified: z.coerce.date().optional(),
  status: VariationStatusEnum,
  claimedValue: z.number(),
  approvedValue: z.number().optional(),
  approvedDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
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

export const CreateVariationInputSchema = VariationNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  dateNotified: true,
  approvedValue: true,
  approvedDate: true,
  approvedBy: true,
  notes: true,
  metadata: true,
});

export const UpdateVariationInputSchema = VariationNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const VARIATION_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT variation_unique IF NOT EXISTS
  FOR (v:Variation) REQUIRE (v.projectId, v.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX variation_project_id IF NOT EXISTS
  FOR (v:Variation) ON (v.projectId);
  
  CREATE INDEX variation_status IF NOT EXISTS
  FOR (v:Variation) ON (v.status);
  
  CREATE INDEX variation_date IF NOT EXISTS
  FOR (v:Variation) ON (v.dateIdentified);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const VARIATION_QUERIES = {
  getAllVariations: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(v:Variation)
    WHERE v.isDeleted IS NULL OR v.isDeleted = false
    RETURN v {
      .*,
      dateIdentified: toString(v.dateIdentified),
      dateNotified: toString(v.dateNotified),
      approvedDate: toString(v.approvedDate),
      createdAt: toString(v.createdAt),
      updatedAt: toString(v.updatedAt)
    } as variation
    ORDER BY v.dateIdentified DESC
  `,
  
  getVariationByNumber: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    WHERE v.isDeleted IS NULL OR v.isDeleted = false
    RETURN v {
      .*,
      dateIdentified: toString(v.dateIdentified),
      dateNotified: toString(v.dateNotified),
      approvedDate: toString(v.approvedDate),
      createdAt: toString(v.createdAt),
      updatedAt: toString(v.updatedAt)
    } as variation
  `,
  
  createVariation: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (v:Variation)
    SET v = $properties
    SET v.projectId = $projectId
    SET v.createdAt = datetime()
    SET v.updatedAt = datetime()
    SET v.status = coalesce(v.status, 'identified')
    CREATE (v)-[:BELONGS_TO_PROJECT]->(p)
    RETURN v {
      .*,
      dateIdentified: toString(v.dateIdentified),
      dateNotified: toString(v.dateNotified),
      approvedDate: toString(v.approvedDate),
      createdAt: toString(v.createdAt),
      updatedAt: toString(v.updatedAt)
    } as variation
  `,
  
  updateVariation: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    SET v += $properties
    SET v.updatedAt = datetime()
    RETURN v {
      .*,
      dateIdentified: toString(v.dateIdentified),
      dateNotified: toString(v.dateNotified),
      approvedDate: toString(v.approvedDate),
      createdAt: toString(v.createdAt),
      updatedAt: toString(v.updatedAt)
    } as variation
  `,
  
  approveVariation: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    SET v.status = 'approved'
    SET v.approvedValue = $approvedValue
    SET v.approvedDate = datetime()
    SET v.approvedBy = $userEmail
    SET v.updatedAt = datetime()
    RETURN v {
      .*,
      dateIdentified: toString(v.dateIdentified),
      dateNotified: toString(v.dateNotified),
      approvedDate: toString(v.approvedDate),
      createdAt: toString(v.createdAt),
      updatedAt: toString(v.updatedAt)
    } as variation
  `,
  
  deleteVariation: `
    MATCH (v:Variation {projectId: $projectId, number: $number})
    SET v.isDeleted = true
    SET v.deletedAt = datetime()
    SET v.deletedBy = $userId
    SET v.updatedAt = datetime()
    RETURN v
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const VARIATION_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every variation belongs to exactly one project'
    },
    { 
      type: 'AFFECTS', 
      target: 'ScheduleItem', 
      cardinality: '0..*',
      description: 'Variation affects schedule items'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type VariationStatus = z.infer<typeof VariationStatusEnum>;
export type CreateVariationInput = z.infer<typeof CreateVariationInputSchema>;
export type UpdateVariationInput = z.infer<typeof UpdateVariationInputSchema>;
