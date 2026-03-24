import { query } from '../../shared/db';

/**
 * Organization record type
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

/**
 * Find an organization by ID
 */
export async function findOrgById(id: string): Promise<Organization | null> {
  const result = await query<Organization>(
    'SELECT id, name, slug, plan, created_at FROM organizations WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find an organization by slug
 */
export async function findOrgBySlug(slug: string): Promise<Organization | null> {
  const result = await query<Organization>(
    'SELECT id, name, slug, plan, created_at FROM organizations WHERE slug = $1',
    [slug]
  );
  return result.rows[0] || null;
}

/**
 * Create a new organization
 */
export async function createOrg(
  name: string,
  slug: string,
  plan: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<Organization> {
  const result = await query<Organization>(
    `INSERT INTO organizations (name, slug, plan)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug, plan, created_at`,
    [name, slug, plan]
  );

  if (!result.rows[0]) {
    throw new Error('Failed to create organization');
  }

  return result.rows[0];
}

/**
 * Update an organization's plan
 */
export async function updateOrgPlan(
  id: string,
  plan: 'free' | 'pro' | 'enterprise'
): Promise<Organization> {
  const result = await query<Organization>(
    `UPDATE organizations 
     SET plan = $1
     WHERE id = $2
     RETURNING id, name, slug, plan, created_at`,
    [plan, id]
  );

  if (!result.rows[0]) {
    throw new Error('Organization not found');
  }

  return result.rows[0];
}
