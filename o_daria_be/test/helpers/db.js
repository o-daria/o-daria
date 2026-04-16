/**
 * test/helpers/db.js
 *
 * Shared test database setup and teardown for integration tests.
 *
 * Usage:
 *   import { setupTestDb, teardownTestDb, truncateTables } from '../helpers/db.js';
 *
 *   before(async () => {
 *     await setupTestDb();
 *   });
 *
 *   afterEach(async () => {
 *     await truncateTables(['profile_analyses', 'segment_library', 'reports']);
 *   });
 *
 *   after(async () => {
 *     await teardownTestDb();
 *   });
 *
 * Requires DATABASE_URL_TEST environment variable pointing to a PostgreSQL
 * test database with pgvector installed and the runtime schema applied:
 *   psql $DATABASE_URL_TEST -f src/db/schema_runtime.sql
 *
 * The test DB should be SEPARATE from the development/production DB.
 * All tables are truncated between tests — never use a production DB here.
 */

import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Connects to the test database. Call once in before().
 * Throws immediately if DATABASE_URL_TEST is not set.
 */
export async function setupTestDb() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      'DATABASE_URL_TEST is not set. Integration tests require a dedicated test database.\n' +
      'Example: DATABASE_URL_TEST=postgresql://localhost/audience_test npm test'
    );
  }

  pool = new Pool({ connectionString: url });

  // Verify connectivity
  const client = await pool.connect();
  client.release();

  return pool;
}

/**
 * Returns the test pool. Call after setupTestDb().
 */
export function getTestPool() {
  if (!pool) throw new Error('Call setupTestDb() first');
  return pool;
}

/**
 * Truncates the given tables in order. Safe to call between tests.
 * Uses CASCADE to handle foreign key constraints.
 *
 * @param {string[]} tables - Table names to truncate
 */
export async function truncateTables(tables = []) {
  if (!pool) return;
  if (tables.length === 0) return;

  const tableList = tables.join(', ');
  await pool.query(`TRUNCATE ${tableList} CASCADE`);
}

/**
 * Closes the pool. Call once in after().
 */
export async function teardownTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Convenience: run a query against the test DB.
 */
export async function testQuery(text, values = []) {
  if (!pool) throw new Error('Call setupTestDb() first');
  return pool.query(text, values);
}
