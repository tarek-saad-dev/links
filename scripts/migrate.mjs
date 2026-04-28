#!/usr/bin/env node
/**
 * Database Migration Runner
 * Usage: node scripts/migrate.mjs
 */

import pg from "pg";

const { Pool } = pg;

// Same connection as db.ts
const connectionString =
  "postgresql://neondb_owner:npg_JFoDL76Mvtfa@ep-delicate-paper-antese7n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔧 Starting migration...");
    await client.query("BEGIN");

    // Check if style_ref_id column exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'daily_tasks' AND column_name = 'style_ref_id'
    `);

    if (checkResult.rows.length === 0) {
      console.log("✓ style_ref_id column already migrated or doesn't exist");

      // Check if style_ref_ids exists
      const checkNew = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'daily_tasks' AND column_name = 'style_ref_ids'
      `);

      if (checkNew.rows.length === 0) {
        console.log("⚠️ Neither column exists - adding style_ref_ids fresh");
        await client.query(`
          ALTER TABLE daily_tasks
          ADD COLUMN style_ref_ids TEXT DEFAULT '[]'
        `);
      }
    } else {
      console.log("📦 Migrating style_ref_id to style_ref_ids...");

      // Step 1: Add new column
      await client.query(`
        ALTER TABLE daily_tasks
        ADD COLUMN style_ref_ids TEXT DEFAULT '[]'
      `);

      // Step 2: Migrate existing data
      await client.query(`
        UPDATE daily_tasks
        SET style_ref_ids = CASE
          WHEN style_ref_id IS NOT NULL AND style_ref_id != ''
          THEN '[' || to_jsonb(style_ref_id)::text || ']'
          ELSE '[]'
        END
      `);

      // Step 3: Drop old column
      await client.query(`
        ALTER TABLE daily_tasks
        DROP COLUMN style_ref_id
      `);

      console.log("✓ Data migrated successfully");
    }

    // Create migrations table to track this
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Record migration
    await client.query(
      `
      INSERT INTO migrations (name)
      VALUES ('001_update_style_ref_to_array')
      ON CONFLICT (name) DO NOTHING
    `
    );

    await client.query("COMMIT");
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
