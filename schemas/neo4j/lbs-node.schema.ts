import { z } from 'zod';

/**
 * LBS NODE SCHEMA
 * 
 * Location Breakdown Structure - spatial/geographic hierarchy.
 * Agent extracts from drawings and site layout.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface LBSNodeType {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // LBS code (REQUIRED, e.g., "S1.Z2.A3")
  name: string;                              // Location name
  type: 'site' | 'zone' | 'chainage' | 'layer' | 'element' | 'building' | 'floor';
  level: number;                             // Hierarchy level (1 = site)
  parentCode?: string;                       // Parent location code
  
  // Spatial Information
  description?: string;
  locationType?: 'construction_zone' | 'work_area' | 'access_route' | 'safety_zone' | 'quality_control_zone' | 'staging_area' | 'other';
  
  // Positioning
  chainage?: number;
  chainageStart?: number;
  chainageEnd?: number;
  coordinates?: { lat: number; lng: number };
  elevation?: number;
  gridReference?: string;
  
  // Physical Dimensions
  area?: number;
  volume?: number;
  length?: number;
  
  // Construction Information
  constructionSequence?: number;
  accessRoute?: string;
  constructionMethod?: string;
  
  // Technical References
  drawingRefs?: string[];
  specificationRefs?: string[];
  
  // WBS Integration
  linkedWBSCodes?: string[];
  
  // Quality and Safety
  requiresInspection?: boolean;
  isSafetyZone?: boolean;
  safetyRequirements?: string;
  
  // Status
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  
  // Responsibility
  responsibleParty?: string;
  assignedTo?: string;                       // User email
  
  // Additional
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

export type LBSNodeNode = LBSNodeType;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const LBSNodeTypeEnum = z.enum(['site', 'zone', 'chainage', 'layer', 'element', 'building', 'floor']);
export const LBSLocationTypeEnum = z.enum(['construction_zone', 'work_area', 'access_route', 'safety_zone', 'quality_control_zone', 'staging_area', 'other']);
export const LBSStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);

export const LBSNodeNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'LBS code is required'),
  name: z.string().min(1, 'Name is required'),
  type: LBSNodeTypeEnum,
  level: z.number().int().min(1, 'Level must be at least 1'),
  parentCode: z.string().optional(),
  
  description: z.string().optional(),
  locationType: LBSLocationTypeEnum.optional(),
  
  chainage: z.number().optional(),
  chainageStart: z.number().optional(),
  chainageEnd: z.number().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  elevation: z.number().optional(),
  gridReference: z.string().optional(),
  
  area: z.number().optional(),
  volume: z.number().optional(),
  length: z.number().optional(),
  
  constructionSequence: z.number().optional(),
  accessRoute: z.string().optional(),
  constructionMethod: z.string().optional(),
  
  drawingRefs: z.array(z.string()).optional(),
  specificationRefs: z.array(z.string()).optional(),
  
  linkedWBSCodes: z.array(z.string()).optional(),
  
  requiresInspection: z.boolean().optional(),
  isSafetyZone: z.boolean().optional(),
  safetyRequirements: z.string().optional(),
  
  status: LBSStatusEnum.optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  
  responsibleParty: z.string().optional(),
  assignedTo: z.string().optional(),
  
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

export const CreateLBSNodeInputSchema = LBSNodeNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateLBSNodeInputSchema = LBSNodeNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const LBS_NODE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT lbs_node_unique IF NOT EXISTS
  FOR (l:LBS_Node) REQUIRE (l.projectId, l.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX lbs_node_project_id IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.projectId);
  
  CREATE INDEX lbs_node_level IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.level);
  
  CREATE INDEX lbs_node_parent IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.parentCode);
  
  CREATE INDEX lbs_node_type IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.type);
  
  CREATE INDEX lbs_node_status IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.status);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const LBS_NODE_QUERIES = {
  getAllNodes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:LBS_Node)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    RETURN l {
      .*,
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as node
    ORDER BY l.code
  `,
  
  getNodeWithChildren: `
    MATCH (l:LBS_Node {projectId: $projectId, code: $code})
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (l)-[:PARENT_OF*]->(child:LBS_Node)
    WHERE child.isDeleted IS NULL OR child.isDeleted = false
    RETURN l {
      .*,
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as node, collect(child) as children
  `,
  
  getRootNodes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(l:LBS_Node)
    WHERE l.level = 1
      AND (l.isDeleted IS NULL OR l.isDeleted = false)
    RETURN l {
      .*,
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as node
    ORDER BY l.code
  `,
  
  createNode: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (l:LBS_Node)
    SET l = $properties
    SET l.projectId = $projectId
    SET l.createdAt = datetime()
    SET l.updatedAt = datetime()
    CREATE (l)-[:BELONGS_TO_PROJECT]->(p)
    WITH l
    OPTIONAL MATCH (parent:LBS_Node {projectId: $projectId, code: l.parentCode})
    FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
      CREATE (parent)-[:PARENT_OF]->(l)
    )
    RETURN l {
      .*,
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as node
  `,
  
  updateNode: `
    MATCH (l:LBS_Node {projectId: $projectId, code: $code})
    SET l += $properties
    SET l.updatedAt = datetime()
    RETURN l {
      .*,
      createdAt: toString(l.createdAt),
      updatedAt: toString(l.updatedAt)
    } as node
  `,
  
  deleteNode: `
    MATCH (l:LBS_Node {projectId: $projectId, code: $code})
    SET l.isDeleted = true
    SET l.deletedAt = datetime()
    SET l.deletedBy = $userId
    SET l.updatedAt = datetime()
    RETURN l
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const LBS_NODE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every LBS node belongs to exactly one project'
    },
    { 
      type: 'PARENT_OF', 
      target: 'LBS_Node', 
      cardinality: '0..*',
      description: 'Parent of child LBS nodes'
    },
  ],
  incoming: [
    { 
      type: 'LOCATED_IN', 
      source: 'Lot', 
      cardinality: '0..*',
      description: 'Lots located in this LBS node'
    },
    { 
      type: 'PARENT_OF', 
      source: 'LBS_Node', 
      cardinality: '0..1',
      description: 'Child of parent LBS node'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type LBSNodeType = z.infer<typeof LBSNodeTypeEnum>;
export type LBSLocationType = z.infer<typeof LBSLocationTypeEnum>;
export type LBSStatus = z.infer<typeof LBSStatusEnum>;
export type CreateLBSNodeInput = z.infer<typeof CreateLBSNodeInputSchema>;
export type UpdateLBSNodeInput = z.infer<typeof UpdateLBSNodeInputSchema>;
