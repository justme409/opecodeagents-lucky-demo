/**
 * Neo4j Schemas - Central Export
 * 
 * All schemas for the Agent-First Architecture.
 * Import from this file for consistency.
 * 
 * NOTE: Individual schema files have been superseded by master-schema-option3.ts
 * This file now exports from the master schema for backward compatibility.
 */

// Export everything from the master schema
export * from './master-schema';

// Export agent manifest
export * from './agent-manifest';

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
    'document-section',
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
  REFERENCE_DATA: [
    'standard',
    'supplier',
    'laboratory',
  ],
} as const;
