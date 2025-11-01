import { z } from 'zod';

/**
 * PROJECT SCHEMA
 * 
 * Comprehensive project metadata extracted from project documents by agents.
 * Root node for all project-related data.
 * Includes parties, contacts, dates, contract details, and full HTML output.
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface ProjectNode {
  id: string;
  
  // Basic Information
  projectName: string;
  projectCode?: string;
  contractNumber?: string;
  projectDescription?: string;
  scopeSummary?: string;
  
  // Location
  projectAddress?: string;
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
  html?: string;
  
  // Legacy fields (for backward compatibility)
  name?: string;
  client?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  description?: string;
  
  // Audit
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const JurisdictionCodeEnum = z.enum(['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);
export const ProjectStatusEnum = z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']);

export const ProjectNodeSchema = z.object({
  id: z.string().uuid(),
  
  // Basic Information
  projectName: z.string().min(1, 'Project name is required'),
  projectCode: z.string().optional(),
  contractNumber: z.string().optional(),
  projectDescription: z.string().optional(),
  scopeSummary: z.string().optional(),
  
  // Location
  projectAddress: z.string().optional(),
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
  html: z.string().optional(),
  
  // Legacy fields
  name: z.string().optional(),
  client: z.string().optional(),
  location: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: ProjectStatusEnum.optional(),
  description: z.string().optional(),
  
  // Audit
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const CreateProjectInputSchema = ProjectNodeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
}).partial({
  status: true,
  metadata: true,
});

export const UpdateProjectInputSchema = ProjectNodeSchema.partial().required({ id: true });

export const PROJECT_CONSTRAINTS = `
  CREATE CONSTRAINT project_id_unique IF NOT EXISTS
  FOR (p:Project) REQUIRE p.id IS UNIQUE;
  
  CREATE INDEX project_status IF NOT EXISTS
  FOR (p:Project) ON (p.status);
  
  CREATE INDEX project_client IF NOT EXISTS
  FOR (p:Project) ON (p.client);
`;

// ============================================================================
// NEO4J QUERIES
// ============================================================================

export const PROJECT_QUERIES = {
  getProject: `
    MATCH (p:Project {id: $projectId})
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      startDate: toString(p.startDate),
      endDate: toString(p.endDate)
    } as project
  `,
  
  getAllProjects: `
    MATCH (p:Project)
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      startDate: toString(p.startDate),
      endDate: toString(p.endDate)
    } as project
    ORDER BY p.updatedAt DESC
  `,
  
  createProject: `
    CREATE (p:Project)
    SET p = $properties
    SET p.id = randomUUID()
    SET p.createdAt = datetime()
    SET p.updatedAt = datetime()
    SET p.status = coalesce(p.status, 'planning')
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      startDate: toString(p.startDate),
      endDate: toString(p.endDate)
    } as project
  `,
  
  updateProject: `
    MATCH (p:Project {id: $projectId})
    SET p += $properties
    SET p.updatedAt = datetime()
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      startDate: toString(p.startDate),
      endDate: toString(p.endDate)
    } as project
  `,
  
  getProjectStatistics: `
    MATCH (p:Project {id: $projectId})
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(l:Lot)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(ncr:NCR)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(test:TestRequest)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(wbs:WBSNode)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(lbs:LBSNode)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(itp:ITPTemplate)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(mp:ManagementPlan)
    OPTIONAL MATCH (p)<-[:BELONGS_TO_PROJECT]-(doc:Document)
    RETURN p {
      .*,
      createdAt: toString(p.createdAt),
      updatedAt: toString(p.updatedAt),
      startDate: toString(p.startDate),
      endDate: toString(p.endDate)
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
    MATCH (p:Project {id: $projectId})
    SET p.isDeleted = true
    SET p.deletedAt = datetime()
    SET p.deletedBy = $userId
    RETURN p
  `,
};

export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

