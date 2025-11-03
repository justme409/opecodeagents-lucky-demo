import { z } from 'zod';

/**
 * PROGRESS CLAIM SCHEMA
 * 
 * Monthly progress claims for payment.
 * Agent calculates from conformed lots and quantities.
 * 
 * Primary Key: (projectId, number)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface ProgressClaimNode {
  projectId: string;                         // Project ID (REQUIRED)
  number: string;                            // Claim number (REQUIRED, e.g., "PC-001")
  period: string;
  cutoffDate: Date;
  claimedValue: number;
  certifiedValue?: number;
  status: 'draft' | 'submitted' | 'under_review' | 'certified' | 'paid';
  submittedDate?: Date;
  certifiedDate?: Date;
  paidDate?: Date;
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

export interface ClaimItemNode {
  projectId: string;
  claimNumber: string;
  scheduleItemNumber: string;
  qtyToDate: number;
  qtyPrevious: number;
  qtyThisClaim: number;
  rate: number;
  valueThisClaim: number;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ProgressClaimStatusEnum = z.enum(['draft', 'submitted', 'under_review', 'certified', 'paid']);

export const ProgressClaimNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  number: z.string().min(1, 'Claim number is required'),
  period: z.string().min(1, 'Period is required'),
  cutoffDate: z.coerce.date(),
  claimedValue: z.number(),
  certifiedValue: z.number().optional(),
  status: ProgressClaimStatusEnum,
  submittedDate: z.coerce.date().optional(),
  certifiedDate: z.coerce.date().optional(),
  paidDate: z.coerce.date().optional(),
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

export const ClaimItemNodeSchema = z.object({
  projectId: z.string().min(1),
  claimNumber: z.string().min(1),
  scheduleItemNumber: z.string().min(1),
  qtyToDate: z.number(),
  qtyPrevious: z.number(),
  qtyThisClaim: z.number(),
  rate: z.number(),
  valueThisClaim: z.number(),
});

export const CreateProgressClaimInputSchema = ProgressClaimNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  certifiedValue: true,
  submittedDate: true,
  certifiedDate: true,
  paidDate: true,
  notes: true,
  metadata: true,
});

export const UpdateProgressClaimInputSchema = ProgressClaimNodeSchema.partial().required({ 
  projectId: true, 
  number: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const PROGRESS_CLAIM_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT progress_claim_unique IF NOT EXISTS
  FOR (pc:ProgressClaim) REQUIRE (pc.projectId, pc.number) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX progress_claim_project_id IF NOT EXISTS
  FOR (pc:ProgressClaim) ON (pc.projectId);
  
  CREATE INDEX progress_claim_status IF NOT EXISTS
  FOR (pc:ProgressClaim) ON (pc.status);
  
  CREATE INDEX progress_claim_cutoff_date IF NOT EXISTS
  FOR (pc:ProgressClaim) ON (pc.cutoffDate);
`;

export const CLAIM_ITEM_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT claim_item_unique IF NOT EXISTS
  FOR (ci:ClaimItem) REQUIRE (ci.projectId, ci.claimNumber, ci.scheduleItemNumber) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX claim_item_project_id IF NOT EXISTS
  FOR (ci:ClaimItem) ON (ci.projectId);
  
  CREATE INDEX claim_item_claim IF NOT EXISTS
  FOR (ci:ClaimItem) ON (ci.claimNumber);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const PROGRESS_CLAIM_QUERIES = {
  getAllClaims: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(pc:ProgressClaim)
    WHERE pc.isDeleted IS NULL OR pc.isDeleted = false
    RETURN pc {
      .*,
      cutoffDate: toString(pc.cutoffDate),
      submittedDate: toString(pc.submittedDate),
      certifiedDate: toString(pc.certifiedDate),
      paidDate: toString(pc.paidDate),
      createdAt: toString(pc.createdAt),
      updatedAt: toString(pc.updatedAt)
    } as claim
    ORDER BY pc.cutoffDate DESC
  `,
  
  getClaimDetail: `
    MATCH (pc:ProgressClaim {projectId: $projectId, number: $claimNumber})
    WHERE pc.isDeleted IS NULL OR pc.isDeleted = false
    OPTIONAL MATCH (pc)-[:INCLUDES]->(ci:ClaimItem)
    RETURN pc {
      .*,
      cutoffDate: toString(pc.cutoffDate),
      submittedDate: toString(pc.submittedDate),
      certifiedDate: toString(pc.certifiedDate),
      paidDate: toString(pc.paidDate),
      createdAt: toString(pc.createdAt),
      updatedAt: toString(pc.updatedAt)
    } as claim, collect(ci) as claimItems
  `,
  
  createClaim: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (pc:ProgressClaim)
    SET pc = $properties
    SET pc.projectId = $projectId
    SET pc.createdAt = datetime()
    SET pc.updatedAt = datetime()
    SET pc.status = coalesce(pc.status, 'draft')
    CREATE (pc)-[:BELONGS_TO_PROJECT]->(p)
    RETURN pc {
      .*,
      cutoffDate: toString(pc.cutoffDate),
      submittedDate: toString(pc.submittedDate),
      certifiedDate: toString(pc.certifiedDate),
      paidDate: toString(pc.paidDate),
      createdAt: toString(pc.createdAt),
      updatedAt: toString(pc.updatedAt)
    } as claim
  `,
  
  updateClaim: `
    MATCH (pc:ProgressClaim {projectId: $projectId, number: $claimNumber})
    SET pc += $properties
    SET pc.updatedAt = datetime()
    RETURN pc {
      .*,
      cutoffDate: toString(pc.cutoffDate),
      submittedDate: toString(pc.submittedDate),
      certifiedDate: toString(pc.certifiedDate),
      paidDate: toString(pc.paidDate),
      createdAt: toString(pc.createdAt),
      updatedAt: toString(pc.updatedAt)
    } as claim
  `,
  
  deleteClaim: `
    MATCH (pc:ProgressClaim {projectId: $projectId, number: $claimNumber})
    SET pc.isDeleted = true
    SET pc.deletedAt = datetime()
    SET pc.deletedBy = $userId
    SET pc.updatedAt = datetime()
    RETURN pc
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const PROGRESS_CLAIM_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every claim belongs to exactly one project'
    },
    { 
      type: 'INCLUDES', 
      target: 'ClaimItem', 
      cardinality: '0..*',
      description: 'Claim includes claim items'
    },
  ],
  incoming: [],
};

export const CLAIM_ITEM_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'FOR_SCHEDULE_ITEM', 
      target: 'ScheduleItem', 
      cardinality: '1',
      description: 'Claim item for schedule item'
    },
  ],
  incoming: [
    { 
      type: 'INCLUDES', 
      source: 'ProgressClaim', 
      cardinality: '1',
      description: 'Included in claim'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ProgressClaimStatus = z.infer<typeof ProgressClaimStatusEnum>;
export type CreateProgressClaimInput = z.infer<typeof CreateProgressClaimInputSchema>;
export type UpdateProgressClaimInput = z.infer<typeof UpdateProgressClaimInputSchema>;
