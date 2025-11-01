import { z } from 'zod';

/**
 * DOCUMENT SCHEMA
 * 
 * Document register with revisions and supersession tracking.
 * Agent extracts metadata from uploaded documents.
 */

export interface DocumentNode {
  id: string;
  
  // Core Metadata
  docKind: 'drawing' | 'document';              // Fundamental type
  documentNumber?: string;                       // e.g., "C-001", "SPEC-123"
  revisionCode?: string;                         // e.g., "A", "Rev 1"
  title?: string;                                // Document title
  
  // Classification
  type?: 'specification' | 'drawing' | 'report' | 'procedure' | 'plan' | 'correspondence' | 'schedule' | 'manual' | 'other';
  category?: string;                             // More specific category
  subtype?: string;                              // Non-prescriptive subtype
  discipline?: 'civil' | 'structural' | 'electrical' | 'mechanical' | 'architectural' | 'hydraulic' | 'geotechnical' | 'other';
  classificationLevel?: 'internal' | 'confidential' | 'public' | 'commercial_in_confidence';
  
  // Drawing-Specific
  sheetNumber?: string;                          // e.g., "1", "A-101"
  totalSheets?: number;                          // Total sheets in set
  scale?: string;                                // e.g., "1:100 @A1"
  drawingType?: string;                          // e.g., "plan", "section", "detail"
  
  // Responsibility
  author?: string;                               // Author name or company
  preparedBy?: string;                           // Person who prepared
  checkedBy?: string;                            // Person who checked
  approvedBy?: string;                           // Person who approved (name, not UUID)
  contractorName?: string;                       // Contractor/org name
  
  // Dates
  issueDate?: Date;                              // Original issue date
  lastUpdatedDate?: Date;                        // Last update date
  date?: Date;                                   // Generic date field (legacy)
  
  // Status and Versioning
  status: 'draft' | 'in_review' | 'approved' | 'superseded' | 'archived';
  purpose?: string;                              // Purpose of this revision
  supersedes?: string[];                         // Document IDs this supersedes
  supersededById?: string;                       // Document ID that supersedes this
  
  // File Information
  fileUrl: string;                               // URL to file
  fileName?: string;                             // Original filename
  fileSize?: number;                             // Size in bytes
  mimeType?: string;                             // MIME type
  
  // Content
  extractedText?: string;                        // Extracted text content
  summary?: string;                              // Document summary
  
  // References
  relatedDocuments?: string[];                   // Related document IDs
  wbsRefs?: string[];                           // Related WBS nodes
  lbsRefs?: string[];                           // Related LBS locations
  
  // Legacy field mapping
  number?: string;                               // Alias for documentNumber
  revision?: string;                             // Alias for revisionCode
  
  // Additional
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export const DocumentKindEnum = z.enum(['drawing', 'document']);
export const DocumentTypeEnum = z.enum(['specification', 'drawing', 'report', 'procedure', 'plan', 'correspondence', 'schedule', 'manual', 'other']);
export const DocumentStatusEnum = z.enum(['draft', 'in_review', 'approved', 'superseded', 'archived']);
export const DocumentDisciplineEnum = z.enum(['civil', 'structural', 'electrical', 'mechanical', 'architectural', 'hydraulic', 'geotechnical', 'other']);
export const DocumentClassificationEnum = z.enum(['internal', 'confidential', 'public', 'commercial_in_confidence']);

export const DocumentNodeSchema = z.object({
  id: z.string().uuid(),
  
  // Core Metadata
  docKind: DocumentKindEnum,
  documentNumber: z.string().optional(),
  revisionCode: z.string().optional(),
  title: z.string().optional(),
  
  // Classification
  type: DocumentTypeEnum.optional(),
  category: z.string().optional(),
  subtype: z.string().optional(),
  discipline: DocumentDisciplineEnum.optional(),
  classificationLevel: DocumentClassificationEnum.optional(),
  
  // Drawing-Specific
  sheetNumber: z.string().optional(),
  totalSheets: z.number().optional(),
  scale: z.string().optional(),
  drawingType: z.string().optional(),
  
  // Responsibility
  author: z.string().optional(),
  preparedBy: z.string().optional(),
  checkedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  contractorName: z.string().optional(),
  
  // Dates
  issueDate: z.coerce.date().optional(),
  lastUpdatedDate: z.coerce.date().optional(),
  date: z.coerce.date().optional(),
  
  // Status and Versioning
  status: DocumentStatusEnum,
  purpose: z.string().optional(),
  supersedes: z.array(z.string()).optional(),
  supersededById: z.string().uuid().optional(),
  
  // File Information
  fileUrl: z.string().url(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  
  // Content
  extractedText: z.string().optional(),
  summary: z.string().optional(),
  
  // References
  relatedDocuments: z.array(z.string()).optional(),
  wbsRefs: z.array(z.string()).optional(),
  lbsRefs: z.array(z.string()).optional(),
  
  // Legacy field mapping
  number: z.string().optional(),
  revision: z.string().optional(),
  
  // Additional
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
});

export const DOCUMENT_CONSTRAINTS = `
  CREATE CONSTRAINT document_id_unique IF NOT EXISTS
  FOR (d:Document) REQUIRE d.id IS UNIQUE;
  
  CREATE INDEX document_number IF NOT EXISTS
  FOR (d:Document) ON (d.number);
  
  CREATE INDEX document_type IF NOT EXISTS
  FOR (d:Document) ON (d.type);
  
  CREATE INDEX document_status IF NOT EXISTS
  FOR (d:Document) ON (d.status);
`;

export const DOCUMENT_QUERIES = {
  getAllDocuments: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(d:Document)
    WHERE d.isDeleted IS NULL OR d.isDeleted = false
    RETURN d
    ORDER BY d.number, d.revision DESC
  `,
  
  getDocumentDetail: `
    MATCH (d:Document {id: $documentId})
    WHERE d.isDeleted IS NULL OR d.isDeleted = false
    OPTIONAL MATCH (d)-[:SUPERSEDES]->(old:Document)
    OPTIONAL MATCH (new:Document)-[:SUPERSEDES]->(d)
    OPTIONAL MATCH (d)-[:RELATED_TO]->(related)
    RETURN d, old, new, collect(related) as relatedItems
  `,
  
  getDocumentsByType: `
    MATCH (p:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(d:Document)
    WHERE d.type = $type
      AND (d.isDeleted IS NULL OR d.isDeleted = false)
    RETURN d
    ORDER BY d.number, d.revision DESC
  `,
  
  createDocument: `
    CREATE (d:Document $properties)
    SET d.id = randomUUID()
    SET d.createdAt = datetime()
    SET d.updatedAt = datetime()
    SET d.status = coalesce(d.status, 'draft')
    WITH d
    MATCH (p:Project {id: $projectId})
    CREATE (d)-[:BELONGS_TO_PROJECT]->(p)
    WITH d
    OPTIONAL MATCH (old:Document {id: $supersededById})
    FOREACH (_ IN CASE WHEN old IS NOT NULL THEN [1] ELSE [] END |
      CREATE (d)-[:SUPERSEDES]->(old)
      SET old.status = 'superseded'
    )
    RETURN d
  `,
};

export type DocumentType = z.infer<typeof DocumentTypeEnum>;
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;

