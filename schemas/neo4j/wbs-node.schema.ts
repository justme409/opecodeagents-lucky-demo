import { z } from 'zod';

/**
 * WBS NODE SCHEMA
 * 
 * Work Breakdown Structure - hierarchical decomposition of work.
 * Agent extracts from project program/schedule.
 * 
 * Primary Key: (projectId, code)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface WBSNodeType {
  projectId: string;                         // Project ID (REQUIRED)
  code: string;                              // WBS code (REQUIRED, e.g., "1.2.3")
  name: string;                              // Deliverable name
  level: number;                             // Hierarchy level (1 = root)
  parentCode?: string;                       // Parent node code
  
  // Deliverable Information
  description?: string;
  deliverableType?: 'project' | 'major_component' | 'sub_deliverable' | 'work_package';
  category?: 'earthworks' | 'drainage' | 'pavements' | 'structures' | 'services' | 'landscaping' | 'other';
  
  // Cost Information
  budgetedCost?: number;
  estimatedCost?: number;
  currencyUnit?: string;
  
  // Schedule Information
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Technical References
  specificationRefs?: string[];
  drawingRefs?: string[];
  standardsRefs?: string[];
  
  // Responsibility
  responsibleParty?: string;
  assignedTo?: string;                       // User email
  
  // Status
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;
  
  // Quality Integration
  requiresITP?: boolean;
  itpRefs?: string[];
  
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

export type WBSNodeNode = WBSNodeType;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const WBSDeliverableTypeEnum = z.enum(['project', 'major_component', 'sub_deliverable', 'work_package']);
export const WBSCategoryEnum = z.enum(['earthworks', 'drainage', 'pavements', 'structures', 'services', 'landscaping', 'other']);
export const WBSStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);

export const WBSNodeNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  code: z.string().min(1, 'WBS code is required'),
  name: z.string().min(1, 'Name is required'),
  level: z.number().int().min(1, 'Level must be at least 1'),
  parentCode: z.string().optional(),
  
  description: z.string().optional(),
  deliverableType: WBSDeliverableTypeEnum.optional(),
  category: WBSCategoryEnum.optional(),
  
  budgetedCost: z.number().optional(),
  estimatedCost: z.number().optional(),
  currencyUnit: z.string().optional(),
  
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  actualStartDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  
  specificationRefs: z.array(z.string()).optional(),
  drawingRefs: z.array(z.string()).optional(),
  standardsRefs: z.array(z.string()).optional(),
  
  responsibleParty: z.string().optional(),
  assignedTo: z.string().optional(),
  
  status: WBSStatusEnum.optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  
  requiresITP: z.boolean().optional(),
  itpRefs: z.array(z.string()).optional(),
  
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

export const CreateWBSNodeInputSchema = WBSNodeNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateWBSNodeInputSchema = WBSNodeNodeSchema.partial().required({ 
  projectId: true, 
  code: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const WBS_NODE_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT wbs_node_unique IF NOT EXISTS
  FOR (w:WBS_Node) REQUIRE (w.projectId, w.code) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX wbs_node_project_id IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.projectId);
  
  CREATE INDEX wbs_node_level IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.level);
  
  CREATE INDEX wbs_node_parent IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.parentCode);
  
  CREATE INDEX wbs_node_status IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.status);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const WBS_NODE_QUERIES = {
  getAllNodes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(w:WBS_Node)
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    RETURN w {
      .*,
      plannedStartDate: toString(w.plannedStartDate),
      plannedEndDate: toString(w.plannedEndDate),
      actualStartDate: toString(w.actualStartDate),
      actualEndDate: toString(w.actualEndDate),
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as node
    ORDER BY w.code
  `,
  
  getNodeWithChildren: `
    MATCH (w:WBS_Node {projectId: $projectId, code: $code})
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    OPTIONAL MATCH (w)-[:PARENT_OF*]->(child:WBS_Node)
    WHERE child.isDeleted IS NULL OR child.isDeleted = false
    RETURN w {
      .*,
      plannedStartDate: toString(w.plannedStartDate),
      plannedEndDate: toString(w.plannedEndDate),
      actualStartDate: toString(w.actualStartDate),
      actualEndDate: toString(w.actualEndDate),
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as node, collect(child) as children
  `,
  
  getRootNodes: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(w:WBS_Node)
    WHERE w.level = 1
      AND (w.isDeleted IS NULL OR w.isDeleted = false)
    RETURN w {
      .*,
      plannedStartDate: toString(w.plannedStartDate),
      plannedEndDate: toString(w.plannedEndDate),
      actualStartDate: toString(w.actualStartDate),
      actualEndDate: toString(w.actualEndDate),
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as node
    ORDER BY w.code
  `,
  
  createNode: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (w:WBS_Node)
    SET w = $properties
    SET w.projectId = $projectId
    SET w.createdAt = datetime()
    SET w.updatedAt = datetime()
    CREATE (w)-[:BELONGS_TO_PROJECT]->(p)
    WITH w
    OPTIONAL MATCH (parent:WBS_Node {projectId: $projectId, code: w.parentCode})
    FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
      CREATE (parent)-[:PARENT_OF]->(w)
    )
    RETURN w {
      .*,
      plannedStartDate: toString(w.plannedStartDate),
      plannedEndDate: toString(w.plannedEndDate),
      actualStartDate: toString(w.actualStartDate),
      actualEndDate: toString(w.actualEndDate),
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as node
  `,
  
  updateNode: `
    MATCH (w:WBS_Node {projectId: $projectId, code: $code})
    SET w += $properties
    SET w.updatedAt = datetime()
    RETURN w {
      .*,
      plannedStartDate: toString(w.plannedStartDate),
      plannedEndDate: toString(w.plannedEndDate),
      actualStartDate: toString(w.actualStartDate),
      actualEndDate: toString(w.actualEndDate),
      createdAt: toString(w.createdAt),
      updatedAt: toString(w.updatedAt)
    } as node
  `,
  
  deleteNode: `
    MATCH (w:WBS_Node {projectId: $projectId, code: $code})
    SET w.isDeleted = true
    SET w.deletedAt = datetime()
    SET w.deletedBy = $userId
    SET w.updatedAt = datetime()
    RETURN w
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const WBS_NODE_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every WBS node belongs to exactly one project'
    },
    { 
      type: 'PARENT_OF', 
      target: 'WBS_Node', 
      cardinality: '0..*',
      description: 'Parent of child WBS nodes'
    },
  ],
  incoming: [
    { 
      type: 'COVERS_WBS', 
      source: 'Lot', 
      cardinality: '0..*',
      description: 'Lots cover this WBS node'
    },
    { 
      type: 'PARENT_OF', 
      source: 'WBS_Node', 
      cardinality: '0..1',
      description: 'Child of parent WBS node'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type WBSDeliverableType = z.infer<typeof WBSDeliverableTypeEnum>;
export type WBSCategory = z.infer<typeof WBSCategoryEnum>;
export type WBSStatus = z.infer<typeof WBSStatusEnum>;
export type CreateWBSNodeInput = z.infer<typeof CreateWBSNodeInputSchema>;
export type UpdateWBSNodeInput = z.infer<typeof UpdateWBSNodeInputSchema>;
