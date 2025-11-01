import { z } from 'zod';

/**
 * LBS NODE SCHEMA
 * 
 * Location Breakdown Structure - spatial/geographic hierarchy.
 * Agent extracts from drawings and site layout.
 */

export interface LBSNodeType {
  id: string;
  code: string;                       // LBS code (e.g., "S1.Z2.A3")
  name: string;                       // Location name
  type: 'site' | 'zone' | 'chainage' | 'layer' | 'element' | 'building' | 'floor';
  level: number;                      // Hierarchy level (1 = site)
  parentId?: string;                  // Parent location ID
  
  // Spatial Information
  description?: string;
  locationType?: 'construction_zone' | 'work_area' | 'access_route' | 'safety_zone' | 'quality_control_zone' | 'staging_area' | 'other';
  
  // Positioning
  chainage?: number;                  // For linear projects (roads, pipelines)
  chainageStart?: number;             // Start chainage for ranges
  chainageEnd?: number;               // End chainage for ranges
  coordinates?: { lat: number; lng: number };
  elevation?: number;                 // Elevation above datum
  gridReference?: string;             // Building grid reference (e.g., "A1-D4")
  
  // Physical Dimensions
  area?: number;                      // Area in m²
  volume?: number;                    // Volume in m³
  length?: number;                    // Length in m
  
  // Construction Information
  constructionSequence?: number;      // Order of construction
  accessRoute?: string;               // How to access this location
  constructionMethod?: string;        // Method statement reference
  
  // Technical References
  drawingRefs?: string[];             // Related drawing numbers
  specificationRefs?: string[];       // Specification sections
  
  // WBS Integration
  linkedWBSNodes?: string[];          // IDs of related WBS nodes
  
  // Quality and Safety
  requiresInspection?: boolean;
  isSafetyZone?: boolean;
  safetyRequirements?: string;
  
  // Status
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;           // 0-100
  
  // Responsibility
  responsibleParty?: string;          // Organization/party responsible
  assignedTo?: string;                // User ID of assigned person
  
  // Schedule
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Additional
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Legacy alias for backward compatibility
export type LBSNodeNode = LBSNodeType;

export const LBSNodeTypeEnum = z.enum(['site', 'zone', 'chainage', 'layer', 'element', 'building', 'floor']);
export const LBSLocationTypeEnum = z.enum(['construction_zone', 'work_area', 'access_route', 'safety_zone', 'quality_control_zone', 'staging_area', 'other']);
export const LBSStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);

export const LBSNodeNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1, 'LBS code is required'),
  name: z.string().min(1, 'Name is required'),
  type: LBSNodeTypeEnum,
  level: z.number().int().min(1, 'Level must be at least 1'),
  parentId: z.string().uuid().optional(),
  
  // Spatial Information
  description: z.string().optional(),
  locationType: LBSLocationTypeEnum.optional(),
  
  // Positioning
  chainage: z.number().optional(),
  chainageStart: z.number().optional(),
  chainageEnd: z.number().optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  elevation: z.number().optional(),
  gridReference: z.string().optional(),
  
  // Physical Dimensions
  area: z.number().optional(),
  volume: z.number().optional(),
  length: z.number().optional(),
  
  // Construction Information
  constructionSequence: z.number().optional(),
  accessRoute: z.string().optional(),
  constructionMethod: z.string().optional(),
  
  // Technical References
  drawingRefs: z.array(z.string()).optional(),
  specificationRefs: z.array(z.string()).optional(),
  
  // WBS Integration
  linkedWBSNodes: z.array(z.string()).optional(),
  
  // Quality and Safety
  requiresInspection: z.boolean().optional(),
  isSafetyZone: z.boolean().optional(),
  safetyRequirements: z.string().optional(),
  
  // Status
  status: LBSStatusEnum.optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  
  // Responsibility
  responsibleParty: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  
  // Schedule
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  actualStartDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  
  // Additional
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const LBS_NODE_CONSTRAINTS = `
  CREATE CONSTRAINT lbs_node_id_unique IF NOT EXISTS
  FOR (l:LBS_Node) REQUIRE l.id IS UNIQUE;
  
  CREATE INDEX lbs_node_code IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.code);
  
  CREATE INDEX lbs_node_type IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.type);
  
  CREATE INDEX lbs_node_level IF NOT EXISTS
  FOR (l:LBS_Node) ON (l.level);
`;

export const LBS_NODE_QUERIES = {
  getAllNodes: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(l:LBS_Node)
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    RETURN l
    ORDER BY l.code
  `,
  
  getNodeWithChildren: `
    MATCH (l:LBS_Node {id: $nodeId})
    WHERE l.isDeleted IS NULL OR l.isDeleted = false
    OPTIONAL MATCH (l)-[:PARENT_OF*]->(child:LBS_Node)
    WHERE child.isDeleted IS NULL OR child.isDeleted = false
    RETURN l, collect(child) as children
  `,
  
  createNode: `
    CREATE (l:LBS_Node $properties)
    SET l.id = randomUUID()
    SET l.createdAt = datetime()
    SET l.updatedAt = datetime()
    WITH l
    MATCH (p:Project {id: $projectId})
    CREATE (l)-[:BELONGS_TO_PROJECT]->(p)
    WITH l
    OPTIONAL MATCH (parent:LBS_Node {id: $parentId})
    FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
      CREATE (parent)-[:PARENT_OF]->(l)
    )
    RETURN l
  `,
};

export type LBSNodeType = z.infer<typeof LBSNodeTypeEnum>;

