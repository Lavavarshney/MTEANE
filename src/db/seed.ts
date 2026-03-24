import 'dotenv/config';
import { randomBytes } from 'crypto';
import { db, query } from '../shared/db';
import { hashApiKey } from '../utils/hash';

/**
 * Seed the database with test data
 * Creates one test organization and generates an API key for testing
 */
async function seed() {
  try {
    console.log('\n🌱 Seeding database...\n');

    // Create a test organization
    const orgResult = await query(
      `INSERT INTO organizations (name, slug, plan)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug, plan`,
      ['Test Organization', 'test-org', 'free']
    );

    const org = orgResult.rows[0];
    console.log(`✅ Organization created: ${org.slug} (${org.id})\n`);

    // Generate a random 32-byte API key
    const plainKey = randomBytes(32).toString('hex');
    const hashedKey = hashApiKey(plainKey);

    // Store the hashed key in the database
    const keyResult = await query(
      `INSERT INTO api_keys (org_id, key_hash, label, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key_hash) DO UPDATE SET label = EXCLUDED.label
       RETURNING id, org_id, label, is_active`,
      [org.id, hashedKey, 'test-key', true]
    );

    const apiKey = keyResult.rows[0];
    console.log(`✅ API key created: ${apiKey.label} (${apiKey.id})\n`);

    console.log('⚠️  PLAINTEXT API KEY (SAVE THIS NOW — IT WILL NEVER BE SHOWN AGAIN):');
    console.log(`\n   ${plainKey}\n`);
    console.log('Use this key in the x-api-key header for API requests:\n');
    console.log(`   curl -H "x-api-key: ${plainKey}" http://localhost:3000/health\n`);

    console.log('✨ Seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run seed
seed();
