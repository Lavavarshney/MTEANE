import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../shared/db';
import { logger } from '../utils/logger';

const migrationsDir = path.join(__dirname, 'migrations');

/**
 * Run database migrations
 * Reads all .sql files in src/db/migrations directory in alphabetical order
 * and executes them against the database
 */
async function migrate() {
	try {
		logger.info('Starting migrations...');

		// Read all SQL files from migrations directory
		const files = fs
			.readdirSync(migrationsDir)
			.filter(f => f.endsWith('.sql'))
			.sort((a, b) => a.localeCompare(b));

		if (files.length === 0) {
			logger.error({ migrations_dir: migrationsDir }, 'No migration files found');
			process.exit(1);
		}

		logger.info({ count: files.length, files }, 'Migrations discovered');

		// Execute each migration SQL file
		for (const file of files) {
			const filePath = path.join(migrationsDir, file);
			const sql = fs.readFileSync(filePath, 'utf-8');

			try {
				logger.info({ file }, 'Running migration');
				await db.query(sql);
				logger.info({ file }, 'Migration completed');
			} catch (error) {
				logger.error({ file, error }, 'Failed to run migration');
				process.exit(1);
			}
		}

		logger.info('All migrations completed successfully');
		process.exit(0);
	} catch (error) {
		logger.error({ error }, 'Migration error');
		process.exit(1);
	} finally {
		await db.end();
	}
}

migrate();
