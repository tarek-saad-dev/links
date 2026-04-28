#!/usr/bin/env ts-node
/**
 * Simple PostgreSQL migration runner
 * Usage: npx ts-node migrations/run-migration.ts [migration_file]
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(filePath: string): Promise<void> {
  const sql = readFileSync(filePath, "utf-8");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if migration was already run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const filename = filePath.split("/").pop() || filePath.split("\\").pop();
    const { rows } = await client.query(
      "SELECT 1 FROM migrations WHERE filename = $1",
      [filename]
    );

    if (rows.length > 0) {
      console.log(`✓ Migration already run: ${filename}`);
      await client.query("COMMIT");
      return;
    }

    // Run the migration
    console.log(`Running migration: ${filename}...`);
    await client.query(sql);

    // Record migration
    await client.query("INSERT INTO migrations (filename) VALUES ($1)", [
      filename,
    ]);

    await client.query("COMMIT");
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ Migration failed: ${error}`);
    throw error;
  } finally {
    client.release();
  }
}

async function runAllMigrations(): Promise<void> {
  const migrationsDir = join(__dirname);
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    await runMigration(join(migrationsDir, file));
  }

  console.log("\nAll migrations completed!");
  await pool.end();
}

// Main
const specificFile = process.argv[2];

if (specificFile) {
  runMigration(specificFile)
    .then(() => pool.end())
    .catch(() => process.exit(1));
} else {
  runAllMigrations().catch(() => process.exit(1));
}
