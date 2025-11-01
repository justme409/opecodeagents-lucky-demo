import { z } from 'zod';

/**
 * USER SCHEMA
 * 
 * User node (synced from Postgres auth.users).
 * Used for relationships and approvals in Neo4j.
 */

export interface UserNode {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const UserNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  organizationId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const USER_CONSTRAINTS = `
  CREATE CONSTRAINT user_id_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.id IS UNIQUE;
  
  CREATE CONSTRAINT user_email_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.email IS UNIQUE;
  
  CREATE INDEX user_role IF NOT EXISTS
  FOR (u:User) ON (u.role);
  
  CREATE INDEX user_organization IF NOT EXISTS
  FOR (u:User) ON (u.organizationId);
`;

export const USER_QUERIES = {
  getUser: `
    MATCH (u:User {id: $userId})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u
  `,
  
  getUserByEmail: `
    MATCH (u:User {email: $email})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u
  `,
  
  getUsersByOrganization: `
    MATCH (u:User {organizationId: $organizationId})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u
    ORDER BY u.name
  `,
  
  createUser: `
    MERGE (u:User {id: $id})
    ON CREATE SET
      u.name = $name,
      u.email = $email,
      u.role = $role,
      u.organizationId = $organizationId,
      u.createdAt = datetime(),
      u.updatedAt = datetime()
    ON MATCH SET
      u.name = $name,
      u.email = $email,
      u.role = $role,
      u.organizationId = $organizationId,
      u.updatedAt = datetime()
    RETURN u
  `,
  
  syncUser: `
    MERGE (u:User {id: $id})
    SET u += $properties
    SET u.updatedAt = datetime()
    RETURN u
  `,
};

