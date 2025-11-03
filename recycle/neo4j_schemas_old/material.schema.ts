import { z } from 'zod';

/**
 * MATERIAL SCHEMA
 * 
 * Materials used in construction with certificates and approvals.
 * Agent extracts from specifications and submittals.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface MaterialNode {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // Material code (REQUIRED, e.g., "CONC-32MPA")
  name: string;
  type: string;
  supplier: string;
  specification: string;
  batchNumber?: string;
  certificateId?: string;
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

export const MaterialApprovalStatusEnum = z.enum(['pending', 'approved', 'rejected']);

export const MaterialNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'Material code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  specification: z.string().min(1, 'Specification is required'),
  batchNumber: z.string().optional(),
  certificateId: z.string().optional(),
  approvalStatus: MaterialApprovalStatusEnum,
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

export const CreateMaterialInputSchema = MaterialNodeSchema.omit({
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

export const UpdateMaterialInputSchema = MaterialNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const MATERIAL_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT material_unique IF NOT EXISTS
  FOR (m:Material) REQUIRE (m.projectId, m.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX material_project_id IF NOT EXISTS
  FOR (m:Material) ON (m.projectId);
  
  CREATE INDEX material_type IF NOT EXISTS
  FOR (m:Material) ON (m.type);
  
  CREATE INDEX material_approval_status IF NOT EXISTS
  FOR (m:Material) ON (m.approvalStatus);
  
  CREATE INDEX material_supplier IF NOT EXISTS
  FOR (m:Material) ON (m.supplier);
`;

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentMaterialOutput {
  materials: Array<{
    code: string;
    name: string;
    type: string;
    supplier: string;
    specification: string;
    batchNumber?: string;
    certificateId?: string;
  }>;
}

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const MATERIAL_QUERIES = {
  getAllMaterials: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(m:Material)
    WHERE m.isDeleted IS NULL OR m.isDeleted = false
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
    ORDER BY m.code
  `,
  
  getMaterialByCode: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    WHERE m.isDeleted IS NULL OR m.isDeleted = false
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
  `,
  
  getApprovedMaterials: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(m:Material)
    WHERE m.approvalStatus = 'approved'
      AND (m.isDeleted IS NULL OR m.isDeleted = false)
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
    ORDER BY m.code
  `,
  
  createMaterial: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (m:Material)
    SET m = $properties
    SET m.projectId = $projectId
    SET m.createdAt = datetime()
    SET m.updatedAt = datetime()
    SET m.approvalStatus = coalesce(m.approvalStatus, 'pending')
    CREATE (m)-[:BELONGS_TO_PROJECT]->(p)
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
  `,
  
  updateMaterial: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    SET m += $properties
    SET m.updatedAt = datetime()
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
  `,
  
  approveMaterial: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    SET m.approvalStatus = 'approved'
    SET m.approvedDate = datetime()
    SET m.approvedBy = $userEmail
    SET m.updatedAt = datetime()
    RETURN m {
      .*,
      approvedDate: toString(m.approvedDate),
      createdAt: toString(m.createdAt),
      updatedAt: toString(m.updatedAt)
    } as material
  `,
  
  deleteMaterial: `
    MATCH (m:Material {projectId: $projectId, code: $code})
    SET m.isDeleted = true
    SET m.deletedAt = datetime()
    SET m.deletedBy = $userId
    SET m.updatedAt = datetime()
    RETURN m
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const MATERIAL_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every material belongs to exactly one project'
    },
  ],
  incoming: [
    { 
      type: 'USES_MATERIAL', 
      source: 'Lot', 
      cardinality: '0..*',
      description: 'Lots use this material'
    },
    { 
      type: 'TESTS_MATERIAL', 
      source: 'TestRequest', 
      cardinality: '0..*',
      description: 'Test requests test this material'
    },
    { 
      type: 'USES_MATERIAL', 
      source: 'MixDesign', 
      cardinality: '0..*',
      description: 'Mix designs use this material'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type MaterialApprovalStatus = z.infer<typeof MaterialApprovalStatusEnum>;
export type CreateMaterialInput = z.infer<typeof CreateMaterialInputSchema>;
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialInputSchema>;
