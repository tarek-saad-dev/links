/**
 * Neon PostgreSQL Database Connection
 */

import { Pool } from "pg";

// Use the provided connection string
const connectionString =
  "postgresql://neondb_owner:npg_JFoDL76Mvtfa@ep-delicate-paper-antese7n-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Database connected:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Initialize database tables
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create clients table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        notes TEXT DEFAULT '',
        color TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        style_refs JSONB DEFAULT '[]'
      )
    `);

    // Add style_refs column to existing tables that may not have it
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS style_refs JSONB DEFAULT '[]'
    `);

    // Create materials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        local_path TEXT DEFAULT '',
        shoot_date TEXT,
        type TEXT NOT NULL CHECK (type IN ('project', 'library')),
        tags TEXT[] DEFAULT '{}',
        description TEXT DEFAULT '',
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await client.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS local_path TEXT DEFAULT ''
    `);

    // Create daily_tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        material_id TEXT,
        style_ref_ids JSONB DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'todo',
        "order" INTEGER NOT NULL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_tasks' AND column_name = 'style_ref_id') THEN
          ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS style_ref_ids JSONB DEFAULT '[]';
          UPDATE daily_tasks SET style_ref_ids = CASE WHEN style_ref_id IS NOT NULL THEN jsonb_build_array(style_ref_id) ELSE '[]' END;
          ALTER TABLE daily_tasks DROP COLUMN style_ref_id;
        END IF;
      END $$;
    `);

    console.log("✅ Database tables initialized");
  } finally {
    client.release();
  }
}
