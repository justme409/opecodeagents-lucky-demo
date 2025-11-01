import { z } from 'zod';

/**
 * WBS NODE SCHEMA
 * 
 * Work Breakdown Structure - hierarchical decomposition of work.
 * Agent extracts from project program/schedule.
 */

export interface WBSNodeType {
  id: string;
  code: string;                   // WBS code (e.g., "1.2.3")
  name: string;                   // Deliverable name
  level: number;                  // Hierarchy level (1 = root)
  parentId?: string;              // Parent node ID
  
  // Deliverable Information
  description?: string;
  deliverableType?: 'project' | 'major_component' | 'sub_deliverable' | 'work_package';
  category?: 'earthworks' | 'drainage' | 'pavements' | 'structures' | 'services' | 'landscaping' | 'other';
  
  // Cost Information
  budgetedCost?: number;          // Budgeted cost for this deliverable
  estimatedCost?: number;         // Estimated/actual cost
  currencyUnit?: string;          // e.g., "AUD"
  
  // Schedule Information
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Technical References
  specificationRefs?: string[];   // Specification sections/clauses
  drawingRefs?: string[];         // Related drawing numbers
  standardsRefs?: string[];       // Applicable standards
  
  // Responsibility
  responsibleParty?: string;      // Organization/party responsible
  assignedTo?: string;            // User ID of assigned person
  
  // Status
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  percentComplete?: number;       // 0-100
  
  // Quality Integration
  requiresITP?: boolean;          // Does this work package need an ITP?
  itpRefs?: string[];            // IDs of related ITPs
  
  // Additional
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Legacy alias for backward compatibility
export type WBSNodeNode = WBSNodeType;

export const WBSDeliverableTypeEnum = z.enum(['project', 'major_component', 'sub_deliverable', 'work_package']);
export const WBSCategoryEnum = z.enum(['earthworks', 'drainage', 'pavements', 'structures', 'services', 'landscaping', 'other']);
export const WBSStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);

export const WBSNodeNodeSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1, 'WBS code is required'),
  name: z.string().min(1, 'Name is required'),
  level: z.number().int().min(1, 'Level must be at least 1'),
  parentId: z.string().uuid().optional(),
  
  // Deliverable Information
  description: z.string().optional(),
  deliverableType: WBSDeliverableTypeEnum.optional(),
  category: WBSCategoryEnum.optional(),
  
  // Cost Information
  budgetedCost: z.number().optional(),
  estimatedCost: z.number().optional(),
  currencyUnit: z.string().optional(),
  
  // Schedule Information
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  actualStartDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  
  // Technical References
  specificationRefs: z.array(z.string()).optional(),
  drawingRefs: z.array(z.string()).optional(),
  standardsRefs: z.array(z.string()).optional(),
  
  // Responsibility
  responsibleParty: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  
  // Status
  status: WBSStatusEnum.optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  
  // Quality Integration
  requiresITP: z.boolean().optional(),
  itpRefs: z.array(z.string()).optional(),
  
  // Additional
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const WBS_NODE_CONSTRAINTS = `
  CREATE CONSTRAINT wbs_node_id_unique IF NOT EXISTS
  FOR (w:WBS_Node) REQUIRE w.id IS UNIQUE;
  
  CREATE INDEX wbs_node_code IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.code);
  
  CREATE INDEX wbs_node_level IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.level);
  
  CREATE INDEX wbs_node_parent IF NOT EXISTS
  FOR (w:WBS_Node) ON (w.parentId);
`;

export const WBS_NODE_QUERIES = {
  getAllNodes: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(w:WBS_Node)
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    RETURN w
    ORDER BY w.code
  `,
  
  getNodeWithChildren: `
    MATCH (w:WBS_Node {id: $nodeId})
    WHERE w.isDeleted IS NULL OR w.isDeleted = false
    OPTIONAL MATCH (w)-[:PARENT_OF*]->(child:WBS_Node)
    WHERE child.isDeleted IS NULL OR child.isDeleted = false
    RETURN w, collect(child) as children
  `,
  
  getRootNodes: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(w:WBS_Node)
    WHERE w.level = 1
      AND (w.isDeleted IS NULL OR w.isDeleted = false)
    RETURN w
    ORDER BY w.code
  `,
  
  createNode: `
    CREATE (w:WBS_Node $properties)
    SET w.id = randomUUID()
    SET w.createdAt = datetime()
    SET w.updatedAt = datetime()
    WITH w
    MATCH (p:Project {id: $projectId})
    CREATE (w)-[:BELONGS_TO_PROJECT]->(p)
    WITH w
    OPTIONAL MATCH (parent:WBS_Node {id: $parentId})
    FOREACH (_ IN CASE WHEN parent IS NOT NULL THEN [1] ELSE [] END |
      CREATE (parent)-[:PARENT_OF]->(w)
    )
    RETURN w
  `,
};

