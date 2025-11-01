import { z } from 'zod';

/**
 * PHOTO SCHEMA
 * 
 * Photos with EXIF data and relationships to lots, NCRs, inspections.
 * Agent extracts EXIF data and suggests descriptions.
 */

export interface PhotoNode {
  id: string;
  description: string;
  location?: string;
  date: Date;
  takenBy: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  exifData?: Record<string, any>;
  gpsCoordinates?: { lat: number; lng: number };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const PhotoNodeSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  location: z.string().optional(),
  date: z.coerce.date(),
  takenBy: z.string().uuid(),
  fileUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  exifData: z.record(z.any()).optional(),
  gpsCoordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PHOTO_CONSTRAINTS = `
  CREATE CONSTRAINT photo_id_unique IF NOT EXISTS
  FOR (p:Photo) REQUIRE p.id IS UNIQUE;
  
  CREATE INDEX photo_date IF NOT EXISTS
  FOR (p:Photo) ON (p.date);
  
  CREATE INDEX photo_taken_by IF NOT EXISTS
  FOR (p:Photo) ON (p.takenBy);
`;

export const PHOTO_QUERIES = {
  getAllPhotos: `
    MATCH (proj:Project {id: $projectId})<-[:BELONGS_TO_PROJECT]-(p:Photo)
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p
    ORDER BY p.date DESC
  `,
  
  getPhotoDetail: `
    MATCH (p:Photo {id: $photoId})
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    OPTIONAL MATCH (p)-[:RELATED_TO]->(related)
    RETURN p, collect(related) as relatedItems
  `,
  
  getPhotosByLot: `
    MATCH (l:Lot {id: $lotId})<-[:RELATED_TO]-(p:Photo)
    WHERE p.isDeleted IS NULL OR p.isDeleted = false
    RETURN p
    ORDER BY p.date DESC
  `,
  
  createPhoto: `
    CREATE (p:Photo $properties)
    SET p.id = randomUUID()
    SET p.createdAt = datetime()
    SET p.updatedAt = datetime()
    WITH p
    MATCH (proj:Project {id: $projectId})
    CREATE (p)-[:BELONGS_TO_PROJECT]->(proj)
    RETURN p
  `,
  
  linkPhotoToItem: `
    MATCH (p:Photo {id: $photoId})
    MATCH (item {id: $itemId})
    MERGE (p)-[:RELATED_TO]->(item)
    RETURN p, item
  `,
};

