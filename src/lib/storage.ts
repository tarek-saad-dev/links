/**
 * DB-First Storage Layer
 * ======================
 * Primary:  PostgreSQL (Neon DB) — source of truth
 * Fallback: localStorage — offline cache only
 *
 * Write flow: DB first (await) → update localStorage cache
 * Read  flow: DB first → on failure fall back to localStorage cache
 */

import type { AppData } from "./types";

const STORAGE_KEY = "links-archive-data";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// ─── localStorage cache (offline fallback only) ───────────────

export function loadFromLocalStorage(): AppData | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateData(JSON.parse(raw) as AppData);
  } catch {
    return null;
  }
}

export function saveToLocalStorage(data: AppData): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded — silently ignore
  }
}

// ─── Database (primary source) ────────────────────────────────

async function loadFromDatabase(): Promise<AppData | null> {
  try {
    const res = await fetch("/api/db/sync");
    if (!res.ok) return null;
    const data = (await res.json()) as AppData;
    return migrateData(data);
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

// ─── Migration helper (backward compat) ───────────────────────

function migrateData(data: AppData): AppData {
  // Create default workspace if none exists
  const workspaces = (data.workspaces ?? []).map((w) => ({
    ...w,
    type: w.type ?? "freelance",
  }));
  let defaultWorkspaceId = workspaces.find((w) => w.isActive)?.id;
  if (workspaces.length === 0) {
    defaultWorkspaceId = crypto.randomUUID();
    workspaces.push({
      id: defaultWorkspaceId,
      name: "BlackIce",
      color: "#4f46e5",
      description: "الشركة الرئيسية - فيديو إيديتور",
      type: "freelance",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    workspaces,
    clients: (data.clients ?? []).map((c) => ({
      ...c,
      workspaceId: c.workspaceId ?? defaultWorkspaceId!,
      styleRefs: c.styleRefs ?? [],
    })),
    materials: (data.materials ?? []).map((m) => ({
      ...m,
      workspaceId: m.workspaceId ?? defaultWorkspaceId!,
      localPath: m.localPath ?? "",
    })),
    dailyTasks: (data.dailyTasks ?? []).map((t) => ({
      ...t,
      workspaceId: t.workspaceId ?? defaultWorkspaceId!,
    })),
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Load data.
 * 1. Try DB (primary)
 * 2. Fall back to localStorage cache (offline)
 * 3. Return empty data as last resort
 */
export async function loadData(): Promise<AppData> {
  const db = await loadFromDatabase();
  if (db) {
    saveToLocalStorage(db);
    return db;
  }

  const local = loadFromLocalStorage();
  if (local) return local;

  return { workspaces: [], clients: [], materials: [], dailyTasks: [] };
}

/**
 * Save data.
 * 1. Save to DB (primary, awaited)
 * 2. Update localStorage cache
 */
export async function saveData(data: AppData): Promise<void> {
  await saveToDatabase(data);
  saveToLocalStorage(data);
}

/**
 * Pull latest from DB into localStorage cache.
 * Returns the data or null if DB unreachable.
 */
export async function syncFromDatabase(): Promise<AppData | null> {
  const db = await loadFromDatabase();
  if (db) {
    saveToLocalStorage(db);
  }
  return db;
}

export function clearLocalCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function importDataFromJson(json: string): Promise<AppData> {
  const data = JSON.parse(json) as AppData;
  if (!Array.isArray(data.clients) || !Array.isArray(data.materials)) {
    throw new Error("Invalid data format");
  }
  await saveData(data);
  return data;
}
