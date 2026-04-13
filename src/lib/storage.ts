/**
 * Triple-source Storage Layer
 * ==========================
 * 1. localStorage (Primary) - always used in browser
 * 2. Server JSON backup (Secondary) - syncs to file system
 * 3. PostgreSQL Database (Tertiary) - Neon DB
 *
 * Flow:
 * - On load: Try localStorage → empty? try JSON → empty? try PostgreSQL
 * - On save: Save to all 3 sources (localStorage sync, JSON/DB async)
 * - All sources stay in sync
 */

import type { AppData } from "./types";

const STORAGE_KEY = "links-archive-data";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ─── localStorage Operations ───────────────────────────────────

function loadFromLocalStorage(): AppData | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

function saveToLocalStorage(data: AppData): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Server Backup (JSON file) Operations ─────────────────────

async function loadFromServerBackup(): Promise<AppData | null> {
  try {
    const res = await fetch("/api/backup");
    if (!res.ok) return null;
    const data = (await res.json()) as AppData;
    if (data.clients.length > 0 || data.materials.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

async function saveToServerBackup(data: AppData): Promise<boolean> {
  try {
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── PostgreSQL Database Operations ─────────────────────────

async function loadFromDatabase(): Promise<AppData | null> {
  try {
    const res = await fetch("/api/db/sync");
    if (!res.ok) return null;
    const data = (await res.json()) as AppData;
    if (data.clients.length > 0 || data.materials.length > 0) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

async function saveToDatabase(data: AppData): Promise<boolean> {
  try {
    const res = await fetch("/api/db/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Load data with fallback chain:
 * 1. localStorage (primary)
 * 2. Server backup JSON
 * 3. PostgreSQL Database
 * 4. Empty data
 */
export async function loadData(): Promise<AppData> {
  // First try localStorage
  const local = loadFromLocalStorage();
  if (local && (local.clients.length > 0 || local.materials.length > 0)) {
    return local;
  }

  // If localStorage empty, try server backup
  const server = await loadFromServerBackup();
  if (server) {
    saveToLocalStorage(server);
    return server;
  }

  // If server backup empty, try database
  const db = await loadFromDatabase();
  if (db) {
    saveToLocalStorage(db);
    return db;
  }

  return { clients: [], materials: [] };
}

/**
 * Save to all sources:
 * - localStorage (sync, immediate)
 * - Server JSON (async, best effort)
 * - PostgreSQL (async, best effort)
 */
export async function saveData(data: AppData): Promise<void> {
  // Always save to localStorage immediately
  saveToLocalStorage(data);

  // Sync to other sources (don't wait, best effort)
  Promise.all([saveToServerBackup(data), saveToDatabase(data)]).catch(() => {
    // Silent fail - data is safe in localStorage
  });
}

/**
 * Sync from localStorage to all server sources
 */
export async function syncToServer(): Promise<{ json: boolean; db: boolean }> {
  const local = loadFromLocalStorage();
  if (!local) return { json: false, db: false };

  const [json, db] = await Promise.all([
    saveToServerBackup(local),
    saveToDatabase(local),
  ]);

  return { json, db };
}

/**
 * Sync from server backup to localStorage
 */
export async function syncFromServer(): Promise<AppData | null> {
  const server = await loadFromServerBackup();
  if (server) {
    saveToLocalStorage(server);
  }
  return server;
}

/**
 * Sync from database to localStorage
 */
export async function syncFromDatabase(): Promise<AppData | null> {
  const db = await loadFromDatabase();
  if (db) {
    saveToLocalStorage(db);
  }
  return db;
}

/**
 * Migrate all data to database (one-time operation)
 */
export async function migrateToDatabase(data: AppData): Promise<boolean> {
  try {
    const res = await fetch("/api/db/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function clearData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function exportDataAsJson(): string {
  const data = loadFromLocalStorage() ?? { clients: [], materials: [] };
  return JSON.stringify(data, null, 2);
}

export async function importDataFromJson(json: string): Promise<AppData> {
  const data = JSON.parse(json) as AppData;
  if (!Array.isArray(data.clients) || !Array.isArray(data.materials)) {
    throw new Error("Invalid data format");
  }
  await saveData(data);
  return data;
}
