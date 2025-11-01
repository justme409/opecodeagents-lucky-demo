import { z } from 'zod';

/**
 * MATERIAL SCHEMA
 * 
 * Materials used in construction with certificates and approvals.
 * Agent extracts from specifications and submittals.
 */

export interface MaterialNode {
  id: string;
  name: string;
  type: string;
  supplier: string;
  specification: string;
  batchNumber?: string;
  certificateId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const MaterialApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const MaterialNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  supplier: z.string().min(1),
  specification: z.string().min(1),
  batchNumber: z.string().optional(),
  certificateId: z.string().optional(),
  approvalStatus: MaterialApprovalStatusEnum,
  approvedBy: z.string().uuid().optional(),
  approvedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MATERIAL_CONSTRAINTS = `
  CREATE CONSTRAINT material_id_unique IF NOT EXISTS
  FOR (m:Material) REQUIRE m.id IS UNIQUE;
  
  CREATE INDEX material_type IF NOT EXISTS
  FOR (m:Material) ON (m.type);
  
  CREATE INDEX material_approval_status IF NOT EXISTS
  FOR (m:Material) ON (m.approvalStatus);
  
  CREATE INDEX material_supplier IF NOT EXISTS
  FOR (m:Material) ON (m.supplier);
`;

export const MATERIAL_QUERIES = {
  getAllMaterials: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(m:Material)
    WHERE m.isDeleted IS NULL OR m.isDeleted = false
    RETURN m
    ORDER BY m.name
  `,
  
  getApprovedMaterials: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(m:Material)
    WHERE m.approvalStatus = 'approved'
      AND (m.isDeleted IS NULL OR m.isDeleted = false)
    RETURN m
    ORDER BY m.type, m.name
  `,
  
  createMaterial: `
    CREATE (m:Material $properties)
    SET m.id = randomUUID()
    SET m.createdAt = datetime()
    SET m.updatedAt = datetime()
    SET m.approvalStatus = coalesce(m.approvalStatus, 'pending')
    WITH m
    MATCH (p:Project {id: $projectId})
    CREATE (m)-[:BELONGS_TO_PROJECT]->(p)
    RETURN m
  `,
  
  approveMaterial: `
    MATCH (m:Material {id: $materialId})
    SET m.approvalStatus = 'approved'
    SET m.approvedBy = $userId
    SET m.approvedDate = datetime()
    SET m.updatedAt = datetime()
    RETURN m
  `,
};

export type MaterialApprovalStatus = z.infer<typeof MaterialApprovalStatusEnum>;

