import { query } from '../../shared/db';
import { Organization } from './orgs';

/**
 * API Key record type
 */
export interface ApiKey {
  id: string;
  org_id: string;
  key_hash: string;
  label: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

/**
 * Combined API key + organization record
 * Used by auth middleware to get both in one query
 */
export interface ApiKeyWithOrg extends ApiKey {
  organization: Organization;
}

/**
 * Find an active API key by its hash and return it with the organization
 * This is called on every authenticated request — must be fast
 */
export async function findActiveKeyByHash(hash: string): Promise<ApiKeyWithOrg | null> {
  const result = await query<any>(
    `SELECT 
       k.id, k.org_id, k.key_hash, k.label, k.is_active, k.last_used_at, k.created_at,
       o.id AS org_id_verified, o.name, o.slug, o.plan, o.created_at AS org_created_at
     FROM api_keys k
     JOIN organizations o ON k.org_id = o.id
     WHERE k.key_hash = $1
     LIMIT 1`,
    [hash]
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    org_id: row.org_id,
    key_hash: row.key_hash,
    label: row.label,
    is_active: row.is_active,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
    organization: {
      id: row.org_id_verified,
      name: row.name,
      slug: row.slug,
      plan: row.plan,
      created_at: row.org_created_at,
    },
  };
}

/**
 * Find all API keys for an organization
 */
export async function findKeysByOrgId(orgId: string): Promise<ApiKey[]> {
  const result = await query<ApiKey>(
    `SELECT id, org_id, key_hash, label, is_active, last_used_at, created_at
     FROM api_keys
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );

  return result.rows;
}

/**
 * Create a new API key
 */
export async function createApiKey(
  orgId: string,
  keyHash: string,
  label?: string
): Promise<ApiKey> {
  const result = await query<ApiKey>(
    `INSERT INTO api_keys (org_id, key_hash, label, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id, org_id, key_hash, label, is_active, last_used_at, created_at`,
    [orgId, keyHash, label || null]
  );

  if (!result.rows[0]) {
    throw new Error('Failed to create API key');
  }

  return result.rows[0];
}

/**
 * Deactivate an API key
 */
export async function deactivateApiKey(id: string): Promise<ApiKey> {
  const result = await query<ApiKey>(
    `UPDATE api_keys
     SET is_active = false
     WHERE id = $1
     RETURNING id, org_id, key_hash, label, is_active, last_used_at, created_at`,
    [id]
  );

  if (!result.rows[0]) {
    throw new Error('API key not found');
  }

  return result.rows[0];
}

/**
 * Update the last_used_at timestamp for an API key
 * Called after successful authentication
 */
export async function updateLastUsed(id: string): Promise<void> {
  await query(
    `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}
