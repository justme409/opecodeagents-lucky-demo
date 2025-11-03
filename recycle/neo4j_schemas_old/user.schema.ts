import { z } from 'zod';

/**
 * USER SCHEMA
 * 
 * User node (synced from Postgres auth.users).
 * Uses email as primary identifier (stable across systems).
 * Used for relationships and approvals in Neo4j.
 */

// ============================================================================
// TYPESCRIPT TYPES (for Frontend)
// ============================================================================

export interface UserNode {
  email: string;                             // Email (PRIMARY KEY)
  userId: string;                            // User ID from Postgres (for reference)
  name: string;
  role: string;
  organizationId: string;
  projectIds?: string[];                     // Projects this user has access to
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

// ============================================================================
// ZOD SCHEMAS (for Runtime Validation)
// ============================================================================

export const UserNodeSchema = z.object({
  email: z.string().email('Valid email is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  projectIds: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isDeleted: z.boolean().optional(),
  deletedAt: z.coerce.date().optional(),
});

export const CreateUserInputSchema = UserNodeSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  deletedAt: true,
}).partial({
  projectIds: true,
  metadata: true,
});

export const UpdateUserInputSchema = UserNodeSchema.partial().required({ email: true });

// ============================================================================
// NEO4J CYPHER CONSTRAINTS
// ============================================================================

export const USER_CONSTRAINTS = `
  CREATE CONSTRAINT user_email_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.email IS UNIQUE;
  
  CREATE INDEX user_user_id IF NOT EXISTS
  FOR (u:User) ON (u.userId);
  
  CREATE INDEX user_role IF NOT EXISTS
  FOR (u:User) ON (u.role);
  
  CREATE INDEX user_organization IF NOT EXISTS
  FOR (u:User) ON (u.organizationId);
`;

// ============================================================================
// COMMON QUERIES
// ============================================================================

export const USER_QUERIES = {
  getUser: `
    MATCH (u:User {email: $email})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
  `,
  
  getUserByUserId: `
    MATCH (u:User {userId: $userId})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
  `,
  
  getUsersByOrganization: `
    MATCH (u:User {organizationId: $organizationId})
    WHERE u.isDeleted IS NULL OR u.isDeleted = false
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
    ORDER BY u.name
  `,
  
  getUsersByProject: `
    MATCH (u:User)
    WHERE $projectId IN u.projectIds
      AND (u.isDeleted IS NULL OR u.isDeleted = false)
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
    ORDER BY u.name
  `,
  
  createUser: `
    MERGE (u:User {email: $email})
    ON CREATE SET
      u.userId = $userId,
      u.name = $name,
      u.role = $role,
      u.organizationId = $organizationId,
      u.projectIds = coalesce($projectIds, []),
      u.createdAt = datetime(),
      u.updatedAt = datetime()
    ON MATCH SET
      u.userId = $userId,
      u.name = $name,
      u.role = $role,
      u.organizationId = $organizationId,
      u.projectIds = coalesce($projectIds, u.projectIds),
      u.updatedAt = datetime()
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
  `,
  
  syncUser: `
    MERGE (u:User {email: $email})
    SET u += $properties
    SET u.updatedAt = datetime()
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
  `,
  
  addProjectToUser: `
    MATCH (u:User {email: $email})
    SET u.projectIds = coalesce(u.projectIds, []) + $projectId
    SET u.updatedAt = datetime()
    RETURN u {
      .*,
      createdAt: toString(u.createdAt),
      updatedAt: toString(u.updatedAt)
    } as user
  `,
  
  deleteUser: `
    MATCH (u:User {email: $email})
    SET u.isDeleted = true
    SET u.deletedAt = datetime()
    RETURN u
  `,
};

// ============================================================================
// RELATIONSHIP DEFINITIONS
// ============================================================================

export const USER_RELATIONSHIPS = {
  outgoing: [
    // Users don't typically have outgoing relationships
  ],
  incoming: [
    { 
      type: 'APPROVED_BY', 
      source: 'ITP_Template', 
      cardinality: '0..*',
      description: 'User approves ITP templates'
    },
    { 
      type: 'APPROVED_BY', 
      source: 'ITP_Instance', 
      cardinality: '0..*',
      description: 'User approves ITP instances'
    },
    { 
      type: 'REPORTED_BY', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'User reports NCRs'
    },
    { 
      type: 'RESOLVED_BY', 
      source: 'NCR', 
      cardinality: '0..*',
      description: 'User resolves NCRs'
    },
    { 
      type: 'ASSIGNED_TO', 
      source: 'ApprovalInstance', 
      cardinality: '0..*',
      description: 'Approvals assigned to user'
    },
    { 
      type: 'BY_USER', 
      source: 'ApprovalAction', 
      cardinality: '0..*',
      description: 'Actions performed by user'
    },
  ],
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
