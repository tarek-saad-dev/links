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
    // Create workspaces table
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT 'freelance' CHECK (type IN ('salary', 'freelance', 'opportunity')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Add type column if it doesn't exist
    await client.query(`
      ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'freelance'
    `);

    // Create clients table with workspace_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        notes TEXT DEFAULT '',
        color TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        style_refs JSONB DEFAULT '[]'
      )
    `);

    // Add workspace_id column if it doesn't exist
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS workspace_id TEXT
    `);

    // Add style_refs column to existing tables that may not have it
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS style_refs JSONB DEFAULT '[]'
    `);

    // Create materials table with workspace_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS workspace_id TEXT
    `);

    await client.query(`
      ALTER TABLE materials ADD COLUMN IF NOT EXISTS local_path TEXT DEFAULT ''
    `);

    // Create daily_tasks table with workspace_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
      ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS workspace_id TEXT
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

    // Create default workspace if none exists
    const workspaceResult = await client.query(
      `SELECT id FROM workspaces WHERE is_active = TRUE LIMIT 1`,
    );
    if (workspaceResult.rows.length === 0) {
      const defaultId = crypto.randomUUID();
      await client.query(
        `INSERT INTO workspaces (id, name, color, description, type, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          defaultId,
          "BlackIce",
          "#4f46e5",
          "الشركة الرئيسية - فيديو إيديتور",
          "freelance",
          true,
          new Date().toISOString(),
        ],
      );
      // Migrate existing data to default workspace
      await client.query(
        `UPDATE clients SET workspace_id = $1 WHERE workspace_id IS NULL OR workspace_id = ''`,
        [defaultId],
      );
      await client.query(
        `UPDATE materials SET workspace_id = $1 WHERE workspace_id IS NULL OR workspace_id = ''`,
        [defaultId],
      );
      await client.query(
        `UPDATE daily_tasks SET workspace_id = $1 WHERE workspace_id IS NULL OR workspace_id = ''`,
        [defaultId],
      );
    }

    console.log("✅ Database tables initialized with workspaces");
  } finally {
    client.release();
  }
}
