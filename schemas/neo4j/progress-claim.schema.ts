import { z } from 'zod';

/**
 * PROGRESS CLAIM SCHEMA
 * 
 * Monthly progress claims for payment.
 * Agent calculates from conformed lots and quantities.
 */

export interface ProgressClaimNode {
  id: string;
  number: string;
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
}

export interface ClaimItemNode {
  id: string;
  claimId: string;
  scheduleItemId: string;
  qtyToDate: number;
  qtyPrevious: number;
  qtyThisClaim: number;
  rate: number;
  valueThisClaim: number;
}

export const ProgressClaimStatusEnum = z.enum(['draft', 'submitted', 'under_review', 'certified', 'paid']);

export const ProgressClaimNodeSchema = z.object({
  id: z.string().uuid(),
  number: z.string().min(1),
  period: z.string().min(1),
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
});

export const ClaimItemNodeSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  scheduleItemId: z.string().uuid(),
  qtyToDate: z.number(),
  qtyPrevious: z.number(),
  qtyThisClaim: z.number(),
  rate: z.number(),
  valueThisClaim: z.number(),
});

export const PROGRESS_CLAIM_CONSTRAINTS = `
  CREATE CONSTRAINT progress_claim_id_unique IF NOT EXISTS
  FOR (pc:ProgressClaim) REQUIRE pc.id IS UNIQUE;
  
  CREATE CONSTRAINT progress_claim_number_unique IF NOT EXISTS
  FOR (pc:ProgressClaim) REQUIRE pc.number IS UNIQUE;
  
  CREATE INDEX progress_claim_status IF NOT EXISTS
  FOR (pc:ProgressClaim) ON (pc.status);
  
  CREATE INDEX progress_claim_period IF NOT EXISTS
  FOR (pc:ProgressClaim) ON (pc.period);
  
  CREATE CONSTRAINT claim_item_id_unique IF NOT EXISTS
  FOR (ci:ClaimItem) REQUIRE ci.id IS UNIQUE;
`;

export const PROGRESS_CLAIM_QUERIES = {
  getAllClaims: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(pc:ProgressClaim)
    WHERE pc.isDeleted IS NULL OR pc.isDeleted = false
    RETURN pc
    ORDER BY pc.number DESC
  `,
  
  getClaimDetail: `
    MATCH (pc:ProgressClaim {id: $claimId})
    WHERE pc.isDeleted IS NULL OR pc.isDeleted = false
    OPTIONAL MATCH (pc)-[:INCLUDES]->(ci:ClaimItem)-[:FOR_SCHEDULE_ITEM]->(si:ScheduleItem)
    RETURN pc, collect({item: ci, scheduleItem: si}) as claimItems
  `,
  
  createClaim: `
    CREATE (pc:ProgressClaim $properties)
    SET pc.id = randomUUID()
    SET pc.number = 'PC-' + toString(toInteger(rand() * 1000))
    SET pc.createdAt = datetime()
    SET pc.updatedAt = datetime()
    SET pc.status = coalesce(pc.status, 'draft')
    WITH pc
    MATCH (p:Project {id: $projectId})
    CREATE (pc)-[:BELONGS_TO_PROJECT]->(p)
    RETURN pc
  `,
  
  submitClaim: `
    MATCH (pc:ProgressClaim {id: $claimId})
    SET pc.status = 'submitted'
    SET pc.submittedDate = datetime()
    SET pc.updatedAt = datetime()
    RETURN pc
  `,
  
  certifyClaim: `
    MATCH (pc:ProgressClaim {id: $claimId})
    SET pc.status = 'certified'
    SET pc.certifiedValue = $certifiedValue
    SET pc.certifiedDate = datetime()
    SET pc.updatedAt = datetime()
    RETURN pc
  `,
};

export type ProgressClaimStatus = z.infer<typeof ProgressClaimStatusEnum>;

