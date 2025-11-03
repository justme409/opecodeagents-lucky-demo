import { z } from 'zod';

/**
 * PROJECT SCHEMA
 * 
 * Root node for all project-related data.
 * Uses projectId (from Postgres) as the primary identifier.
 * No UUIDs needed - keeps it simple for agents.
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface ProjectNode {
  projectId: string;                         // Project ID from Postgres (PRIMARY KEY)
  
  // Basic Information
  name: string;                              // Project name (REQUIRED)
  code?: string;                             // Internal project code
  contractNumber?: string;                   // Contract number
  description?: string;                      // Brief description
  scopeSummary?: string;                     // Scope summary
  
  // Location
  address?: string;
  stateTerritory?: string;
  localCouncil?: string;
  jurisdiction?: string;
  jurisdictionCode?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  
  // Parties (JSON strings containing structured data)
  parties?: string; // JSON: { client: [], principal: [], parties_mentioned_in_docs: [] }
  
  // Key Dates
  keyDates?: {
    commencementDate?: string;
    practicalCompletionDate?: string;
    defectsLiabilityPeriod?: string;
  };
  
  // Commercial
  contractValue?: string;
  procurementMethod?: string;
  
  // Regulatory
  regulatoryFramework?: string;
  applicableStandards?: string[];
  
  // Source Tracking
  sourceDocuments?: string[];
  provenance?: string;
  
  // HTML Output (comprehensive project details for display)
  htmlContent?: string;
  
  // Status
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  
  // Audit
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;                        // User email or ID
  updatedBy?: string;                        // User email or ID
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const JurisdictionCodeEnum = z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);
export const ProjectStatusEnum = z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']);

export const ProjectNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  
  // Basic Information
  name: z.string().min(1, 'Project name is required'),
  code: z.string().optional(),
  contractNumber: z.string().optional(),
  description: z.string().optional(),
  scopeSummary: z.string().optional(),
  
  // Location
  address: z.string().optional(),
  stateTerritory: z.string().optional(),
  localCouncil: z.string().optional(),
  jurisdiction: z.string().optional(),
  jurisdictionCode: JurisdictionCodeEnum.optional(),
  
  // Parties (JSON strings)
  parties: z.string().optional(),
  
  // Key Dates
  keyDates: z.object({
    commencementDate: z.string().optional(),
    practicalCompletionDate: z.string().optional(),
    defectsLiabilityPeriod: z.string().optional(),
  }).optional(),
  
  // Commercial
  contractValue: z.string().optional(),
  procurementMethod: z.string().optional(),
  
  // Regulatory
  regulatoryFramework: z.string().optional(),
  applicableStandards: z.array(z.string()).optional(),
  
  // Source Tracking
  sourceDocuments: z.array(z.string()).optional(),
  provenance: z.string().optional(),
  
  // HTML Output
  htmlContent: z.string().optional(),
  
  // Status
  status: ProjectStatusEnum.optional(),
  
  // Audit
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateProjectInputSchema = ProjectNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
}).partial({
  status: true,
  metadata: true,
});

export const UpdateProjectInputSchema = ProjectNodeSchema.partial().required({ projectId: true });

export const PROJECT_CONSTRAINTS = `
  CREATE CONSTRAINT project_id_unique IF NOT EXISTS
  FOR (p:Project) REQUIRE p.projectId IS UNIQUE;
  
  CREATE INDEX project_status IF NOT EXISTS
  FOR (p:Project) ON (p.status);
  
  CREATE INDEX project_name IF NOT EXISTS
  FOR (p:Project) ON (p.name);
`;

// ============================================================================
// NEO4J QUERIES
// ============================================================================

export const PROJECT_QUERIES = {
  getProject: `
    MATCH (p:Project {projectId: $projectId})
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      deletedAt: toString(p.deletedAt)
    } as project
  `,
  
  getAllProjects: `
    MATCH (p:Project)
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt)
    } as project
    ORDER BY p.updatedAt DESC
  `,
  
  createProject: `
    CREATE (p:Project)
    SET p = $properties
    SET p.createdAt = datetime()
    SET p.updatedAt = datetime()
    SET p.status = coalesce(p.status, 'planning')
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt)
    } as project
  `,
  
  updateProject: `
    MATCH (p:Project {projectId: $projectId})
    SET p += $properties
    SET p.updatedAt = datetime()
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt)
    } as project
  `,
  
  getProjectStatistics: `
    MATCH (p:Project {projectId: $projectId})
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(l:Lot)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(ncr:NCR)
    WHERE ncr.isDeleted IS NULL OR ncr.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(test:TestRequest)
    WHERE test.isDeleted IS NULL OR test.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(wbs:WBSNode)
    WHERE wbs.isDeleted IS NULL OR wbs.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(lbs:LBSNode)
    WHERE lbs.isDeleted IS NULL OR lbs.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(itp:ITPTemplate)
    WHERE itp.isDeleted IS NULL OR itp.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    WHERE mp.isDeleted IS NULL OR mp.isDeleted = false
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(doc:Document)
    WHERE doc.isDeleted IS NULL OR doc.isDeleted = false
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt)
    } as project,
           count(DISTINCT l) as totalLots,
           count(DISTINCT ncr) as totalNCRs,
           count(DISTINCT test) as totalTests,
           count(DISTINCT wbs) as totalWBS,
           count(DISTINCT lbs) as totalLBS,
           count(DISTINCT itp) as totalITPs,
           count(DISTINCT mp) as totalManagementPlans,
           count(DISTINCT doc) as totalDocuments
  `,
  
  deleteProject: `
    MATCH (p:Project {projectId: $projectId})
    SET p.isDeleted = true
    SET p.deletedAt = datetime()
    SET p.deletedBy = $userId
    RETURN p
  `,
};

// ============================================================================
// AGENT OUTPUT FORMAT
// ============================================================================

export interface AgentProjectOutput {
  project: {
    name: string;
    code?: string;
    contractNumber?: string;
    description?: string;
    scopeSummary?: string;
    address?: string;
    stateTerritory?: string;
    localCouncil?: string;
    jurisdiction?: string;
    jurisdictionCode?: 'QLD' | 'NSW' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
    parties?: string;
    keyDates?: {
      commencementDate?: string;
      practicalCompletionDate?: string;
      defectsLiabilityPeriod?: string;
    };
    contractValue?: string;
    procurementMethod?: string;
    regulatoryFramework?: string;
    applicableStandards?: string[];
    sourceDocuments?: string[];
    htmlContent?: string;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
