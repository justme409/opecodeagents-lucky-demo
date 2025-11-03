import { z } from 'zod';

/**
 * MIX DESIGN SCHEMA
 * 
 * Concrete and asphalt mix designs with proportions and strength requirements.
 * Agent extracts from mix design documents.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface MixDesignNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Mix design code (REQUIRED, e.g., "MIX-32MPA-01")
  description: string;
  type: 'concrete' | 'asphalt' | 'other';
  materials: Array<{ materialCode: string; proportion: number; unit: string }>;
  strength?: string;
  slump?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;                       // User email
  approvedDate?: Date;
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

export const MixDesignTypeEnum = z.enum(['concrete', 'asphalt', 'other']);
export const MixDesignApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const MixDesignNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Mix design code is required'),
  description: z.string().min(1, 'Description is required'),
  type: MixDesignTypeEnum,
  materials: z.array(z.object({
    materialCode: z.string(),
    proportion: z.number(),
    unit: z.string(),
  })),
  strength: z.string().optional(),
  slump: z.string().optional(),
  approvalStatus: MixDesignApprovalStatusEnum,
  approvedBy: z.string().optional(),
  approvedDate: z.coerce.date().optional(),
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

export const CreateMixDesignInputSchema = MixDesignNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  approvalStatus: true,
  approvedBy: true,
  approvedDate: true,
  notes: true,
  metadata: true,
});

export const UpdateMixDesignInputSchema = MixDesignNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const MIX_DESIGN_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT mix_design_unique IF NOT EXISTS
  FOR (md:MixDesign) REQUIRE (md.projectId, md.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX mix_design_project_id IF NOT EXISTS
  FOR (md:MixDesign) ON (md.projectId);
  
  CREATE INDEX mix_design_type IF NOT EXISTS
  FOR (md:MixDesign) ON (md.type);
  
  CREATE INDEX mix_design_approval_status IF NOT EXISTS
  FOR (md:MixDesign) ON (md.approvalStatus);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentMixDesignOutput {
  mixDesigns: Array<{
    code: string;
    description: string;
    type: 'concrete' | 'asphalt' | 'other';
    materials: Array<{ materialCode: string; proportion: number; unit: string }>;
    strength?: string;
    slump?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const MIX_DESIGN_QUERIES = {
  getAllMixDesigns: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(md:MixDesign)
    WHERE md.isDeleted IS NULL OR md.isDeleted = false
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign
    ORDER BY md.code
  `,
  
  getMixDesignByCode: `
    MATCH (md:MixDesign {projectId: $projectId, code: $code})
    WHERE md.isDeleted IS NULL OR md.isDeleted = false
    OPTIONAL MATCH (md)-[:USES_MATERIAL]->(m:Material)
    WHERE m.isDeleted IS NULL OR m.isDeleted = false
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign, collect(m) as materials
  `,
  
  getApprovedMixDesigns: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(md:MixDesign)
    WHERE md.approvalStatus = 'approved'
      AND (md.isDeleted IS NULL OR md.isDeleted = false)
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign
    ORDER BY md.code
  `,
  
  createMixDesign: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (md:MixDesign)
    SET md = $properties
    SET md.projectId = $projectId
    SET md.createdAt = datetime()
    SET md.updatedAt = datetime()
    SET md.approvalStatus = coalesce(md.approvalStatus, 'pending')
    CREATE (md)-[:BELONGS_TO_PROJECT]->(p)
    WITH md
    UNWIND md.materials as matRef
    OPTIONAL MATCH (m:Material {projectId: $projectId, code: matRef.materialCode})
    FOREACH (_ IN CASE WHEN m IS NOT NULL THEN [1] ELSE [] END |
      CREATE (md)-[:USES_MATERIAL]->(m)
    )
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign
  `,
  
  updateMixDesign: `
    MATCH (md:MixDesign {projectId: $projectId, code: $code})
    SET md += $properties
    SET md.updatedAt = datetime()
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign
  `,
  
  approveMixDesign: `
    MATCH (md:MixDesign {projectId: $projectId, code: $code})
    SET md.approvalStatus = 'approved'
    SET md.approvedDate = datetime()
    SET md.approvedBy = $userEmail
    SET md.updatedAt = datetime()
    RETURN md {
      .*,
      approvedDate: toString(md.approvedDate),
      createdAt: toString(md.createdAt),
      updatedAt: toString(md.updatedAt)
    } as mixDesign
  `,
  
  deleteMixDesign: `
    MATCH (md:MixDesign {projectId: $projectId, code: $code})
    SET md.isDeleted = true
    SET md.deletedAt = datetime()
    SET md.deletedBy = $userId
    SET md.updatedAt = datetime()
    RETURN md
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const MIX_DESIGN_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every mix design belongs to exactly one project'
    },
    { 
      type: 'USES_MATERIAL', 
      target: 'Material', 
      cardinality: '0..*',
      description: 'Mix design uses materials'
    },
  ],
  incoming: [],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type MixDesignType = z.infer<typeof MixDesignTypeEnum>;
export type MixDesignApprovalStatus = z.infer<typeof MixDesignApprovalStatusEnum>;
export type CreateMixDesignInput = z.infer<typeof CreateMixDesignInputSchema>;
export type UpdateMixDesignInput = z.infer<typeof UpdateMixDesignInputSchema>;
