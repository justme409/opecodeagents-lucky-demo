import { z } from 'zod';

/**
 * DOCUMENT SCHEMA
 * 
 * Document register with revisions and supersession tracking.
 * Agent extracts metadata from uploaded documents.
 * 
 * Primary Key: (projectId, documentNumber, revisionCode)
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface DocumentNode {
  projectId: string;                         // Project ID (REQUIRED)
  documentNumber: string;                    // Document number (REQUIRED, e.g., "C-001")
  revisionCode: string;                      // Revision code (REQUIRED, e.g., "A", "Rev 1")
  
  // Core Metadata
  docKind: 'drawing' | 'document';
  title?: string;
  
  // Classification
  type?: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'schedule' | 'manual' | 'other';
  category?: string;
  subtype?: string;
  discipline?: 'civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'hydraulic' | 'geotechnical' | 'other';
  classificationLevel?: 'internal' | 'confidential' | 'public' | 'commercial_in_confidence';
  
  // Drawing-Specific
  sheetNumber?: string;
  totalSheets?: number;
  scale?: string;
  drawingType?: string;
  
  // Responsibility
  author?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;                       // User email
  contractorName?: string;
  
  // Dates
  issueDate?: Date;
  lastUpdatedDate?: Date;
  date?: Date;
  
  // Status and Versioning
  status: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived';
  purpose?: string;
  supersedes?: string[];                     // Document numbers this supersedes
  supersededBy?: string;                     // Document number that supersedes this
  
  // File Information
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Additional
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const DocumentKindEnum = z.enum(['drawing', 'document']);
export const DocumentTypeEnum = z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'schedule', 'manual', 'other']);
export const DocumentDisciplineEnum = z.enum(['civil', 'structural', 'electrical', 'mechanical', 'architectural', 'hydraulic', 'geotechnical', 'other']);
export const DocumentStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']);
export const ClassificationLevelEnum = z.enum(['internal', 'confidential', 'public', 'commercial_in_confidence']);

export const DocumentNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  documentNumber: z.string().min(1, 'Document number is required'),
  revisionCode: z.string().min(1, 'Revision code is required'),
  
  docKind: DocumentKindEnum,
  title: z.string().optional(),
  
  type: DocumentTypeEnum.optional(),
  category: z.string().optional(),
  subtype: z.string().optional(),
  discipline: DocumentDisciplineEnum.optional(),
  classificationLevel: ClassificationLevelEnum.optional(),
  
  sheetNumber: z.string().optional(),
  totalSheets: z.number().optional(),
  scale: z.string().optional(),
  drawingType: z.string().optional(),
  
  author: z.string().optional(),
  preparedBy: z.string().optional(),
  checkedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  contractorName: z.string().optional(),
  
  issueDate: z.coerce.date().optional(),
  lastUpdatedDate: z.coerce.date().optional(),
  date: z.coerce.date().optional(),
  
  status: DocumentStatusEnum,
  purpose: z.string().optional(),
  supersedes: z.array(z.string()).optional(),
  supersededBy: z.string().optional(),
  
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreateDocumentInputSchema = DocumentNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdateDocumentInputSchema = DocumentNodeSchema.partial().required({ 
  projectId: true, 
  documentNumber: true,
  revisionCode: true
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const DOCUMENT_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT document_unique IF NOT EXISTS
  FOR (d:Document) REQUIRE (d.projectId, d.documentNumber, d.revisionCode) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX document_project_id IF NOT EXISTS
  FOR (d:Document) ON (d.projectId);
  
  CREATE INDEX document_number IF NOT EXISTS
  FOR (d:Document) ON (d.documentNumber);
  
  CREATE INDEX document_status IF NOT EXISTS
  FOR (d:Document) ON (d.status);
  
  CREATE INDEX document_type IF NOT EXISTS
  FOR (d:Document) ON (d.type);
  
  CREATE INDEX document_discipline IF NOT EXISTS
  FOR (d:Document) ON (d.discipline);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const DOCUMENT_QUERIES = {
  getAllDocuments: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(d:Document)
    WHERE d.isDeleted IS NULL OR d.isDeleted = false
    RETURN d {
      .*,
      issueDate: toString(d.issueDate),
      lastUpdatedDate: toString(d.lastUpdatedDate),
      date: toString(d.date),
      createdAt: toString(d.createdAt),
      updatedAt: toString(d.updatedAt)
    } as document
    ORDER BY d.documentNumber, d.revisionCode
  `,
  
  getDocumentByNumber: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber, revisionCode: $revisionCode})
    WHERE d.isDeleted IS NULL OR d.isDeleted = false
    RETURN d {
      .*,
      issueDate: toString(d.issueDate),
      lastUpdatedDate: toString(d.lastUpdatedDate),
      date: toString(d.date),
      createdAt: toString(d.createdAt),
      updatedAt: toString(d.updatedAt)
    } as document
  `,
  
  getLatestRevision: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(d:Document)
    WHERE d.documentNumber = $documentNumber
      AND (d.isDeleted IS NULL OR d.isDeleted = false)
    RETURN d {
      .*,
      issueDate: toString(d.issueDate),
      lastUpdatedDate: toString(d.lastUpdatedDate),
      date: toString(d.date),
      createdAt: toString(d.createdAt),
      updatedAt: toString(d.updatedAt)
    } as document
    ORDER BY d.revisionCode DESC
    LIMIT 1
  `,
  
  createDocument: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (d:Document)
    SET d = $properties
    SET d.projectId = $projectId
    SET d.createdAt = datetime()
    SET d.updatedAt = datetime()
    CREATE (d)-[:BELONGS_TO_PROJECT]->(p)
    RETURN d {
      .*,
      issueDate: toString(d.issueDate),
      lastUpdatedDate: toString(d.lastUpdatedDate),
      date: toString(d.date),
      createdAt: toString(d.createdAt),
      updatedAt: toString(d.updatedAt)
    } as document
  `,
  
  updateDocument: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber, revisionCode: $revisionCode})
    SET d += $properties
    SET d.updatedAt = datetime()
    RETURN d {
      .*,
      issueDate: toString(d.issueDate),
      lastUpdatedDate: toString(d.lastUpdatedDate),
      date: toString(d.date),
      createdAt: toString(d.createdAt),
      updatedAt: toString(d.updatedAt)
    } as document
  `,
  
  deleteDocument: `
    MATCH (d:Document {projectId: $projectId, documentNumber: $documentNumber, revisionCode: $revisionCode})
    SET d.isDeleted = true
    SET d.deletedAt = datetime()
    SET d.deletedBy = $userId
    SET d.updatedAt = datetime()
    RETURN d
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const DOCUMENT_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every document belongs to exactly one project'
    },
    { 
      type: 'SUPERSEDES', 
      target: 'Document', 
      cardinality: '0..*',
      description: 'Document supersedes older versions'
    },
    { 
      type: 'RELATED_TO', 
      target: 'Lot', 
      cardinality: '0..*',
      description: 'Document may be related to lots'
    },
    { 
      type: 'RELATED_TO', 
      target: 'NCR', 
      cardinality: '0..*',
      description: 'Document may be related to NCRs'
    },
    { 
      type: 'RELATED_TO', 
      target: 'ITP_Template', 
      cardinality: '0..*',
      description: 'Document may be related to ITP templates'
    },
  ],
  incoming: [
    { 
      type: 'SUPERSEDES', 
      source: 'Document', 
      cardinality: '0..1',
      description: 'Superseded by newer version'
    },
    { 
      type: 'RELATED_TO', 
      source: 'Lot', 
      cardinality: '0..*',
      description: 'Lots may reference this document'
    },
    { 
      type: 'RELATED_TO', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'NCRs may reference this document'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type DocumentKind = z.infer<typeof DocumentKindEnum>;
export type DocumentType = z.infer<typeof DocumentTypeEnum>;
export type DocumentDiscipline = z.infer<typeof DocumentDisciplineEnum>;
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;
export type ClassificationLevel = z.infer<typeof ClassificationLevelEnum>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;
