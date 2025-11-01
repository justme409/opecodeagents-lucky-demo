/**
 * Neo4j Schemas - Central Export
 * 
 * All schemas for the Agent-First Architecture.
 * Import from this file for consistency.
 */

// Quality Core
export * from './lot.schema';
export * from './itp-template.schema';
export * from './itp-instance.schema';
export * from './inspection-point.schema';
export * from './ncr.schema';
export * from './test-request.schema';
export * from './test-method.schema';
export * from './sample.schema';
export * from './material.schema';
export * from './mix-design.schema';

// Progress & Payment
export * from './schedule-item.schema';
export * from './progress-claim.schema';
export * from './variation.schema';
export * from './quantity.schema';

// Project Structure
export * from './wbs-node.schema';
export * from './lbs-node.schema';
export * from './work-type.schema';
export * from './area-code.schema';

// Documents & Records
export * from './document.schema';
export * from './photo.schema';
export * from './management-plan.schema';

// Approvals
export * from './workflow.schema';
export * from './workflow-step.schema';
export * from './approval-instance.schema';
export * from './approval-action.schema';

// Infrastructure
export * from './project.schema';
export * from './user.schema';

/**
 * Helper function to get all constraint queries
 */
export function getAllConstraints(): string[] {
  return [
    // Quality Core
    require('./lot.schema').LOT_CONSTRAINTS,
    require('./itp-template.schema').ITP_TEMPLATE_CONSTRAINTS,
    require('./itp-instance.schema').ITP_INSTANCE_CONSTRAINTS,
    require('./inspection-point.schema').INSPECTION_POINT_CONSTRAINTS,
    require('./ncr.schema').NCR_CONSTRAINTS,
    require('./test-request.schema').TEST_REQUEST_CONSTRAINTS,
    require('./test-method.schema').TEST_METHOD_CONSTRAINTS,
    require('./sample.schema').SAMPLE_CONSTRAINTS,
    require('./material.schema').MATERIAL_CONSTRAINTS,
    require('./mix-design.schema').MIX_DESIGN_CONSTRAINTS,
    
    // Progress & Payment
    require('./schedule-item.schema').SCHEDULE_ITEM_CONSTRAINTS,
    require('./progress-claim.schema').PROGRESS_CLAIM_CONSTRAINTS,
    require('./variation.schema').VARIATION_CONSTRAINTS,
    require('./quantity.schema').QUANTITY_CONSTRAINTS,
    
    // Project Structure
    require('./wbs-node.schema').WBS_NODE_CONSTRAINTS,
    require('./lbs-node.schema').LBS_NODE_CONSTRAINTS,
    require('./work-type.schema').WORK_TYPE_CONSTRAINTS,
    require('./area-code.schema').AREA_CODE_CONSTRAINTS,
    
    // Documents
    require('./document.schema').DOCUMENT_CONSTRAINTS,
    require('./photo.schema').PHOTO_CONSTRAINTS,
    require('./management-plan.schema').MANAGEMENT_PLAN_CONSTRAINTS,
    
    // Approvals
    require('./workflow.schema').WORKFLOW_CONSTRAINTS,
    require('./workflow-step.schema').WORKFLOW_STEP_CONSTRAINTS,
    require('./approval-instance.schema').APPROVAL_INSTANCE_CONSTRAINTS,
    require('./approval-action.schema').APPROVAL_ACTION_CONSTRAINTS,
    
    // Infrastructure
    require('./project.schema').PROJECT_CONSTRAINTS,
    require('./user.schema').USER_CONSTRAINTS,
  ];
}

/**
 * Schema categories for organization
 */
export const SCHEMA_CATEGORIES = {
  QUALITY_CORE: [
    'lot',
    'itp-template',
    'itp-instance',
    'inspection-point',
    'ncr',
    'test-request',
    'test-method',
    'sample',
    'material',
    'mix-design',
  ],
  PROGRESS_PAYMENT: [
    'schedule-item',
    'progress-claim',
    'variation',
    'quantity',
  ],
  PROJECT_STRUCTURE: [
    'wbs-node',
    'lbs-node',
    'work-type',
    'area-code',
  ],
  DOCUMENTS: [
    'document',
    'photo',
    'management-plan',
  ],
  APPROVALS: [
    'workflow',
    'workflow-step',
    'approval-instance',
    'approval-action',
  ],
  INFRASTRUCTURE: [
    'project',
    'user',
  ],
} as const;

