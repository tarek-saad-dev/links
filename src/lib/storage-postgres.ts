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
import type { AppData, Client, DailyTask, MaterialLink } from "./types";

// ─── Client Operations ─────────────────────────────────────────

export async function getClientsFromDB(): Promise<Client[]> {
  const result = await pool.query(
    "SELECT * FROM clients ORDER BY created_at DESC",
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    notes: row.notes || "",
    color: row.color,
    createdAt: row.created_at,
    styleRefs: row.style_refs ?? [],
  }));
}

export async function saveClientToDB(client: Client): Promise<void> {
  await pool.query(
    `INSERT INTO clients (id, name, slug, notes, color, created_at, style_refs)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       slug = EXCLUDED.slug,
       notes = EXCLUDED.notes,
       color = EXCLUDED.color,
       style_refs = EXCLUDED.style_refs`,
    [
      client.id,
      client.name,
      client.slug,
      client.notes,
      client.color,
      client.createdAt,
      JSON.stringify(client.styleRefs ?? []),
    ],
  );
}

export async function deleteClientFromDB(id: string): Promise<void> {
  await pool.query("DELETE FROM clients WHERE id = $1", [id]);
}

// ─── Material Operations ─────────────────────────────────────

export async function getMaterialsFromDB(): Promise<MaterialLink[]> {
  const result = await pool.query(
    "SELECT * FROM materials ORDER BY created_at DESC",
  );
  return result.rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    url: row.url,
    localPath: row.local_path || "",
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
    `INSERT INTO materials (id, client_id, title, url, local_path, shoot_date, type, tags, description, is_favorite, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       client_id = EXCLUDED.client_id,
       title = EXCLUDED.title,
       url = EXCLUDED.url,
       local_path = EXCLUDED.local_path,
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
      material.localPath || null,
      material.shootDate || null,
      material.type,
      material.tags,
      material.description,
      material.isFavorite,
      material.createdAt,
      material.updatedAt,
    ],
  );
}

export async function deleteMaterialFromDB(id: string): Promise<void> {
  await pool.query("DELETE FROM materials WHERE id = $1", [id]);
}

// ─── Daily Task Operations ────────────────────────────────────

export async function getDailyTasksFromDB(): Promise<DailyTask[]> {
  const result = await pool.query(
    'SELECT * FROM daily_tasks ORDER BY date DESC, "order" ASC',
  );
  return result.rows.map((row) => ({
    id: row.id,
    date: row.date,
    title: row.title,
    clientId: row.client_id,
    materialId: row.material_id ?? null,
    styleRefIds: Array.isArray(row.style_ref_ids)
      ? row.style_ref_ids
      : row.style_ref_ids
        ? JSON.parse(row.style_ref_ids)
        : [],
    status: row.status,
    order: row.order,
    notes: row.notes || "",
    createdAt: row.created_at,
  }));
}

export async function saveDailyTaskToDB(task: DailyTask): Promise<void> {
  await pool.query(
    `INSERT INTO daily_tasks (id, date, title, client_id, material_id, style_ref_ids, status, "order", notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       date = EXCLUDED.date,
       title = EXCLUDED.title,
       client_id = EXCLUDED.client_id,
       material_id = EXCLUDED.material_id,
       style_ref_ids = EXCLUDED.style_ref_ids,
       status = EXCLUDED.status,
       "order" = EXCLUDED."order",
       notes = EXCLUDED.notes`,
    [
      task.id,
      task.date,
      task.title,
      task.clientId,
      task.materialId ?? null,
      task.styleRefIds,
      task.status,
      task.order,
      task.notes,
      task.createdAt,
    ],
  );
}

export async function deleteDailyTaskFromDB(id: string): Promise<void> {
  await pool.query("DELETE FROM daily_tasks WHERE id = $1", [id]);
}

// ─── Bulk Operations ──────────────────────────────────────────

export async function getAllDataFromDB(): Promise<AppData> {
  const [clients, materials, dailyTasks] = await Promise.all([
    getClientsFromDB(),
    getMaterialsFromDB(),
    getDailyTasksFromDB(),
  ]);
  return { clients, materials, dailyTasks };
}

export async function saveAllDataToDB(data: AppData): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM daily_tasks");
    await client.query("DELETE FROM materials");
    await client.query("DELETE FROM clients");

    // Insert clients
    for (const c of data.clients) {
      await client.query(
        `INSERT INTO clients (id, name, slug, notes, color, created_at, style_refs)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          c.id,
          c.name,
          c.slug,
          c.notes,
          c.color,
          c.createdAt,
          JSON.stringify(c.styleRefs ?? []),
        ],
      );
    }

    // Insert materials
    for (const m of data.materials) {
      await client.query(
        `INSERT INTO materials (id, client_id, title, url, local_path, shoot_date, type, tags, description, is_favorite, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          m.id,
          m.clientId,
          m.title,
          m.url,
          m.localPath || null,
          m.shootDate || null,
          m.type,
          m.tags,
          m.description,
          m.isFavorite,
          m.createdAt,
          m.updatedAt,
        ],
      );
    }

    // Insert daily tasks
    for (const t of data.dailyTasks ?? []) {
      await client.query(
        `INSERT INTO daily_tasks (id, date, title, client_id, material_id, style_ref_ids, status, "order", notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          t.id,
          t.date,
          t.title,
          t.clientId,
          t.materialId ?? null,
          JSON.stringify(t.styleRefIds),
          t.status,
          t.order,
          t.notes,
          t.createdAt,
        ],
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
    await client.query("DELETE FROM daily_tasks");
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
