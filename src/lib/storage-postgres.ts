/**
 * PostgreSQL Storage Layer (Neon Database)
 * 
 * This is the THIRD source in the chain:
 * 1. localStorage (Primary - browser)
 * 2. Server JSON backup (Secondary - file)
 * 3. PostgreSQL (Tertiary - database)
 * 
 * All sources sync with each other.
 */

import { pool } from "./db";
import type { AppData, Client, MaterialLink } from "./types";

// ─── Client Operations ─────────────────────────────────────────

export async function getClientsFromDB(): Promise<Client[]> {
  const result = await pool.query("SELECT * FROM clients ORDER BY created_at DESC");
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    notes: row.notes || "",
    color: row.color,
    createdAt: row.created_at,
  }));
}

export async function saveClientToDB(client: Client): Promise<void> {
  await pool.query(
    `INSERT INTO clients (id, name, slug, notes, color, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       slug = EXCLUDED.slug,
       notes = EXCLUDED.notes,
       color = EXCLUDED.color`,
    [client.id, client.name, client.slug, client.notes, client.color, client.createdAt]
  );
}

export async function deleteClientFromDB(id: string): Promise<void> {
  await pool.query("DELETE FROM clients WHERE id = $1", [id]);
}

// ─── Material Operations ─────────────────────────────────────

export async function getMaterialsFromDB(): Promise<MaterialLink[]> {
  const result = await pool.query("SELECT * FROM materials ORDER BY created_at DESC");
  return result.rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    url: row.url,
    shootDate: row.shoot_date || "",
    type: row.type,
    tags: row.tags || [],
    description: row.description || "",
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function saveMaterialToDB(material: MaterialLink): Promise<void> {
  await pool.query(
    `INSERT INTO materials (id, client_id, title, url, shoot_date, type, tags, description, is_favorite, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       title = EXCLUDED.title,
       url = EXCLUDED.url,
       shoot_date = EXCLUDED.shoot_date,
       type = EXCLUDED.type,
       tags = EXCLUDED.tags,
       description = EXCLUDED.description,
       is_favorite = EXCLUDED.is_favorite,
       updated_at = EXCLUDED.updated_at`,
    [
      material.id,
      material.clientId,
      material.title,
      material.url,
      material.shootDate || null,
      material.type,
      material.tags,
      material.description,
      material.isFavorite,
      material.createdAt,
      material.updatedAt,
    ]
  );
}

export async function deleteMaterialFromDB(id: string): Promise<void> {
  await pool.query("DELETE FROM materials WHERE id = $1", [id]);
}

// ─── Bulk Operations ──────────────────────────────────────────

export async function getAllDataFromDB(): Promise<AppData> {
  const [clients, materials] = await Promise.all([
    getClientsFromDB(),
    getMaterialsFromDB(),
  ]);
  return { clients, materials };
}

export async function saveAllDataToDB(data: AppData): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM materials");
    await client.query("DELETE FROM clients");

    // Insert clients
    for (const c of data.clients) {
      await client.query(
        `INSERT INTO clients (id, name, slug, notes, color, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [c.id, c.name, c.slug, c.notes, c.color, c.createdAt]
      );
    }

    // Insert materials
    for (const m of data.materials) {
      await client.query(
        `INSERT INTO materials (id, client_id, title, url, shoot_date, type, tags, description, is_favorite, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          m.id,
          m.clientId,
          m.title,
          m.url,
          m.shootDate || null,
          m.type,
          m.tags,
          m.description,
          m.isFavorite,
          m.createdAt,
          m.updatedAt,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function clearAllDataFromDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM materials");
    await client.query("DELETE FROM clients");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
