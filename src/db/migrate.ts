import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../shared/db';

const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Run database migrations
 * Reads all .sql files in src/db/migrations directory in alphabetical order
 * and executes them against the database
 */
async function migrate() {
	try {
		console.log('\n🔄 Starting migrations...\n');

		// Read all SQL files from migrations directory
		const files = fs
			.readdirSync(migrationsDir)
			.filter(f => f.endsWith('.sql'))
			.sort((a, b) => a.localeCompare(b));

		if (files.length === 0) {
			console.log('❌ No migration files found in', migrationsDir);
			process.exit(1);
		}

		console.log(`Found ${files.length} migration(s):`);
		files.forEach(f => console.log(`  • ${f}`));
		console.log();

		// Execute each migration SQL file
		for (const file of files) {
			const filePath = path.join(migrationsDir, file);
			const sql = fs.readFileSync(filePath, 'utf-8');

			try {
				console.log(`▶️  Running ${file}...`);
				await db.query(sql);
				console.log(`✅ ${file} completed\n`);
			} catch (error) {
				console.error(`❌ Failed to run ${file}`);
				console.error(error);
				process.exit(1);
			}
		}

		console.log('✨ All migrations completed successfully!\n');
		process.exit(0);
	} catch (error) {
		console.error('❌ Migration error:', error);
		process.exit(1);
	} finally {
		await db.end();
	}
}

migrate();
