import { z } from 'zod';

/**
 * MIX DESIGN SCHEMA
 * 
 * Concrete and asphalt mix designs with proportions and strength requirements.
 * Agent extracts from mix design documents.
 */

export interface MixDesignNode {
  id: string;
  code: string;
  description: string;
  type: 'concrete' | 'asphalt' | 'other';
  materials: Array<{ materialId: string; proportion: number; unit: string }>;
  strength?: string;
  slump?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const MixDesignTypeEnum = z.enum(['concrete', 'asphalt', 'other']);
export const MixDesignApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const MixDesignNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  description: z.string().min(1),
  type: MixDesignTypeEnum,
  materials: z.array(z.object({
    materialId: z.string().uuid(),
    proportion: z.number(),
    unit: z.string(),
  })),
  strength: z.string().optional(),
  slump: z.string().optional(),
  approvalStatus: MixDesignApprovalStatusEnum,
  approvedBy: z.string().uuid().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MIX_DESIGN_CONSTRAINTS = `
  CREATE CONSTRAINT mix_design_id_unique IF NOT EXISTS
  FOR (md:MixDesign) REQUIRE md.id IS UNIQUE;
  
  CREATE CONSTRAINT mix_design_code_unique IF NOT EXISTS
  FOR (md:MixDesign) REQUIRE md.code IS UNIQUE;
  
  CREATE INDEX mix_design_type IF NOT EXISTS
  FOR (md:MixDesign) ON (md.type);
  
  CREATE INDEX mix_design_approval_status IF NOT EXISTS
  FOR (md:MixDesign) ON (md.approvalStatus);
`;

export const MIX_DESIGN_QUERIES = {
  getAllMixDesigns: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(md:MixDesign)
    WHERE md.isDeleted IS NULL OR md.isDeleted = false
    RETURN md
    ORDER BY md.code
  `,
  
  getApprovedMixDesigns: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(md:MixDesign)
    WHERE md.approvalStatus = 'approved'
      AND (md.isDeleted IS NULL OR md.isDeleted = false)
    RETURN md
    ORDER BY md.code
  `,
  
  getMixDesignDetail: `
    MATCH (md:MixDesign {id: $mixDesignId})
    WHERE md.isDeleted IS NULL OR md.isDeleted = false
    OPTIONAL MATCH (md)-[:USES_MATERIAL]->(m:Material)
    RETURN md, collect(m) as materials
  `,
  
  createMixDesign: `
    CREATE (md:MixDesign $properties)
    SET md.id = randomUUID()
    SET md.createdAt = datetime()
    SET md.updatedAt = datetime()
    SET md.approvalStatus = coalesce(md.approvalStatus, 'pending')
    WITH md
    MATCH (p:Project {id: $projectId})
    CREATE (md)-[:BELONGS_TO_PROJECT]->(p)
    RETURN md
  `,
  
  approveMixDesign: `
    MATCH (md:MixDesign {id: $mixDesignId})
    SET md.approvalStatus = 'approved'
    SET md.approvedBy = $userId
    SET md.approvedDate = datetime()
    SET md.updatedAt = datetime()
    RETURN md
  `,
};

export type MixDesignType = z.infer<typeof MixDesignTypeEnum>;
export type MixDesignApprovalStatus = z.infer<typeof MixDesignApprovalStatusEnum>;

