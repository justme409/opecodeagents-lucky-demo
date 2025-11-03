import { z } from 'zod';

/**
 * PHOTO SCHEMA
 * 
 * Photos with EXIF data and relationships to lots, NCRs, inspections.
 * Agent extracts EXIF data and suggests descriptions.
 * 
 * Primary Key: (projectId, fileUrl) - using fileUrl as unique identifier
 */

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface PhotoNode {
  projectId: string;                         // Project ID (REQUIRED)
  fileUrl: string;                           // File URL (REQUIRED, unique identifier)
  description: string;
  location?: string;
  date: Date;
  takenBy: string;                           // User email
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  exifData?: Record<string, any>;
  gpsCoordinates?: { lat: number; lng: number };
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

export const PhotoNodeSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  fileUrl: z.string().url('Valid file URL is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().optional(),
  date: z.coerce.date(),
  takenBy: z.string().min(1, 'Taken by is required'),
  thumbnailUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  exifData: z.record(z.any()).optional(),
  gpsCoordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
  deletedBy: z.string().optional(),
});

export const CreatePhotoInputSchema = PhotoNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  deletedAt: true,
  deletedBy: true,
});

export const UpdatePhotoInputSchema = PhotoNodeSchema.partial().required({ 
  projectId: true, 
  fileUrl: true 
});

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const PHOTO_CONSTRAINTS = `
  -- Composite unique constraint
  CREATE CONSTRAINT photo_unique IF NOT EXISTS
  FOR (p:Photo) REQUIRE (p.projectId, p.fileUrl) IS UNIQUE;
  
  -- Indexes for performance
  CREATE INDEX photo_project_id IF NOT EXISTS
  FOR (p:Photo) ON (p.projectId);
  
  CREATE INDEX photo_date IF NOT EXISTS
  FOR (p:Photo) ON (p.date);
  
  CREATE INDEX photo_taken_by IF NOT EXISTS
  FOR (p:Photo) ON (p.takenBy);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const PHOTO_QUERIES = {
  getAllPhotos: `
    MATCH (p:Project {projectId: $projectId})<-[:BELONGS_TO_PROJECT]-(ph:Photo)
    WHERE ph.isDeleted IS NULL OR ph.isDeleted = false
    RETURN ph {
      .*,
      date: toString(ph.date),
      createdAt: toString(ph.createdAt),
      updatedAt: toString(ph.updatedAt)
    } as photo
    ORDER BY ph.date DESC
  `,
  
  getPhotoByUrl: `
    MATCH (ph:Photo {projectId: $projectId, fileUrl: $fileUrl})
    WHERE ph.isDeleted IS NULL OR ph.isDeleted = false
    RETURN ph {
      .*,
      date: toString(ph.date),
      createdAt: toString(ph.createdAt),
      updatedAt: toString(ph.updatedAt)
    } as photo
  `,
  
  getPhotosByLot: `
    MATCH (l:Lot {projectId: $projectId, number: $lotNumber})<-[:RELATED_TO]-(ph:Photo)
    WHERE ph.isDeleted IS NULL OR ph.isDeleted = false
    RETURN ph {
      .*,
      date: toString(ph.date),
      createdAt: toString(ph.createdAt),
      updatedAt: toString(ph.updatedAt)
    } as photo
    ORDER BY ph.date DESC
  `,
  
  createPhoto: `
    MATCH (p:Project {projectId: $projectId})
    CREATE (ph:Photo)
    SET ph = $properties
    SET ph.projectId = $projectId
    SET ph.createdAt = datetime()
    SET ph.updatedAt = datetime()
    CREATE (ph)-[:BELONGS_TO_PROJECT]->(p)
    RETURN ph {
      .*,
      date: toString(ph.date),
      createdAt: toString(ph.createdAt),
      updatedAt: toString(ph.updatedAt)
    } as photo
  `,
  
  updatePhoto: `
    MATCH (ph:Photo {projectId: $projectId, fileUrl: $fileUrl})
    SET ph += $properties
    SET ph.updatedAt = datetime()
    RETURN ph {
      .*,
      date: toString(ph.date),
      createdAt: toString(ph.createdAt),
      updatedAt: toString(ph.updatedAt)
    } as photo
  `,
  
  deletePhoto: `
    MATCH (ph:Photo {projectId: $projectId, fileUrl: $fileUrl})
    SET ph.isDeleted = true
    SET ph.deletedAt = datetime()
    SET ph.deletedBy = $userId
    SET ph.updatedAt = datetime()
    RETURN ph
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const PHOTO_RELATIONSHIPS = {
  outgoing: [
    { 
      type: 'BELONGS_TO_PROJECT', 
      target: 'Project', 
      cardinality: '1',
      description: 'Every photo belongs to exactly one project'
    },
    { 
      type: 'RELATED_TO', 
      target: 'Lot', 
      cardinality: '0..*',
      description: 'Photo may be related to lots'
    },
    { 
      type: 'RELATED_TO', 
      target: 'NCR', 
      cardinality: '0..*',
      description: 'Photo may be related to NCRs'
    },
    { 
      type: 'RELATED_TO', 
      target: 'InspectionPoint', 
      cardinality: '0..*',
      description: 'Photo may be related to inspection points'
    },
  ],
  incoming: [
    { 
      type: 'RELATED_TO', 
      source: 'Lot', 
      cardinality: '0..*',
      description: 'Lots may reference this photo'
    },
    { 
      type: 'RELATED_TO', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'NCRs may reference this photo'
    },
    { 
      type: 'RELATED_TO', 
      source: 'InspectionPoint', 
      cardinality: '0..*',
      description: 'Inspection points may reference this photo'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreatePhotoInput = z.infer<typeof CreatePhotoInputSchema>;
export type UpdatePhotoInput = z.infer<typeof UpdatePhotoInputSchema>;
