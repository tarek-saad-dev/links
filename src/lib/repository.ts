/**
 * Repository layer – all CRUD operations for clients & materials.
 *
 * Current: Dual-mode storage (localStorage + Server JSON backup)
 * Future: Will add Database as 3rd source
 *
 * All functions are now async to support future database operations.
 */

import type {
  Client,
  MaterialLink,
  AppData,
  StyleRef,
  SocialPlatform,
  DailyTask,
  TaskStatus,
} from "./types";
import { loadData, saveData } from "./storage";
import { generateId, generateSlug, getRandomColor } from "./utils";

// ─── Helpers ────────────────────────────────────────────────

async function getData(): Promise<AppData> {
  return await loadData();
}

async function persist(data: AppData): Promise<void> {
  await saveData(data);
}

// ─── Client CRUD ────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  return (await getData()).clients;
}

export async function getClient(id: string): Promise<Client | undefined> {
  return (await getData()).clients.find((c) => c.id === id);
}

export async function createClient(
  input: Pick<Client, "name" | "notes"> & Partial<Pick<Client, "color">>,
): Promise<Client> {
  const data = await getData();
  const client: Client = {
    id: generateId(),
    name: input.name.trim(),
    slug: generateSlug(input.name),
    notes: input.notes ?? "",
    color: input.color || getRandomColor(),
    createdAt: new Date().toISOString(),
    styleRefs: [],
  };
  data.clients.push(client);
  await persist(data);
  return client;
}

export async function updateClient(
  id: string,
  updates: Partial<Pick<Client, "name" | "notes" | "color">>,
): Promise<Client | undefined> {
  const data = await getData();
  const idx = data.clients.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  if (updates.name) {
    data.clients[idx].name = updates.name.trim();
    data.clients[idx].slug = generateSlug(updates.name);
  }
  if (updates.notes !== undefined) data.clients[idx].notes = updates.notes;
  if (updates.color) data.clients[idx].color = updates.color;
  await persist(data);
  return data.clients[idx];
}

export async function deleteClient(id: string): Promise<void> {
  const data = await getData();
  data.clients = data.clients.filter((c) => c.id !== id);
  data.materials = data.materials.filter((m) => m.clientId !== id);
  await persist(data);
}

// ─── Material CRUD ──────────────────────────────────────────

export async function getMaterials(): Promise<MaterialLink[]> {
  return (await getData()).materials;
}

export async function getMaterial(
  id: string,
): Promise<MaterialLink | undefined> {
  return (await getData()).materials.find((m) => m.id === id);
}

export async function getMaterialsByClient(
  clientId: string,
): Promise<MaterialLink[]> {
  return (await getData()).materials.filter((m) => m.clientId === clientId);
}

export async function createMaterial(
  input: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">,
): Promise<MaterialLink> {
  const data = await getData();
  const now = new Date().toISOString();
  const material: MaterialLink = {
    ...input,
    id: generateId(),
    title: input.title.trim(),
    url: input.url.trim(),
    description: input.description?.trim() ?? "",
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now,
  };
  data.materials.push(material);
  await persist(data);
  return material;
}

export async function updateMaterial(
  id: string,
  updates: Partial<Omit<MaterialLink, "id" | "createdAt">>,
): Promise<MaterialLink | undefined> {
  const data = await getData();
  const idx = data.materials.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  data.materials[idx] = {
    ...data.materials[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await persist(data);
  return data.materials[idx];
}

export async function deleteMaterial(id: string): Promise<void> {
  const data = await getData();
  data.materials = data.materials.filter((m) => m.id !== id);
  await persist(data);
}

export async function toggleFavorite(
  id: string,
): Promise<MaterialLink | undefined> {
  const data = await getData();
  const idx = data.materials.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  data.materials[idx].isFavorite = !data.materials[idx].isFavorite;
  data.materials[idx].updatedAt = new Date().toISOString();
  await persist(data);
  return data.materials[idx];
}

// ─── Stats ──────────────────────────────────────────────────

export async function getStats() {
  const data = await getData();
  return {
    totalClients: data.clients.length,
    totalMaterials: data.materials.length,
    totalLibraries: data.materials.filter((m) => m.type === "library").length,
    totalFavorites: data.materials.filter((m) => m.isFavorite).length,
  };
}

export async function getClientStats(clientId: string) {
  const materials = await getMaterialsByClient(clientId);
  const sorted = [...materials].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return {
    totalLinks: materials.length,
    totalLibraries: materials.filter((m) => m.type === "library").length,
    lastAdded: sorted[0]?.createdAt ?? null,
  };
}

// ─── Tags ───────────────────────────────────────────────────

export async function getAllTags(): Promise<string[]> {
  const data = await getData();
  const tagSet = new Set<string>();
  data.materials.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

// ─── Bulk data (for import/export) ──────────────────────────

export async function getAllData(): Promise<AppData> {
  return await getData();
}

export async function setAllData(data: AppData): Promise<void> {
  await persist(data);
}

// ─── Style Refs ──────────────────────────────────────────────

export async function addStyleRef(
  clientId: string,
  input: { platform: SocialPlatform; url: string; note?: string },
): Promise<StyleRef | undefined> {
  const data = await getData();
  const idx = data.clients.findIndex((c) => c.id === clientId);
  if (idx === -1) return undefined;
  if (!data.clients[idx].styleRefs) data.clients[idx].styleRefs = [];
  const ref: StyleRef = {
    id: generateId(),
    platform: input.platform,
    url: input.url.trim(),
    note: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  data.clients[idx].styleRefs.push(ref);
  await persist(data);
  return ref;
}

export async function updateStyleRef(
  clientId: string,
  refId: string,
  updates: Partial<Pick<StyleRef, "platform" | "url" | "note">>,
): Promise<StyleRef | undefined> {
  const data = await getData();
  const ci = data.clients.findIndex((c) => c.id === clientId);
  if (ci === -1) return undefined;
  if (!data.clients[ci].styleRefs) data.clients[ci].styleRefs = [];
  const ri = data.clients[ci].styleRefs.findIndex((r) => r.id === refId);
  if (ri === -1) return undefined;
  data.clients[ci].styleRefs[ri] = {
    ...data.clients[ci].styleRefs[ri],
    ...updates,
  };
  await persist(data);
  return data.clients[ci].styleRefs[ri];
}

export async function deleteStyleRef(
  clientId: string,
  refId: string,
): Promise<void> {
  const data = await getData();
  const ci = data.clients.findIndex((c) => c.id === clientId);
  if (ci === -1) return;
  if (!data.clients[ci].styleRefs) return;
  data.clients[ci].styleRefs = data.clients[ci].styleRefs.filter(
    (r) => r.id !== refId,
  );
  await persist(data);
}

// ─── Daily Tasks ─────────────────────────────────────────────────────────────

export async function getDailyTasks(date?: string): Promise<DailyTask[]> {
  const data = await getData();
  const tasks = data.dailyTasks ?? [];
  if (date) return tasks.filter((t) => t.date === date);
  return tasks;
}

export async function createDailyTask(input: {
  title: string;
  clientId: string;
  date: string;
  materialId?: string | null;
  styleRefIds?: string[];
  notes?: string;
}): Promise<DailyTask> {
  const data = await getData();
  const tasks = data.dailyTasks ?? [];
  const dayTasks = tasks.filter((t) => t.date === input.date);
  const task: DailyTask = {
    id: generateId(),
    title: input.title.trim(),
    clientId: input.clientId,
    date: input.date,
    materialId: input.materialId ?? null,
    styleRefIds: input.styleRefIds ?? [],
    status: "todo",
    order: dayTasks.length,
    notes: input.notes?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
  data.dailyTasks = [...tasks, task];
  await persist(data);
  return task;
}

export async function updateDailyTask(
  id: string,
  updates: Partial<
    Pick<
      DailyTask,
      | "title"
      | "status"
      | "notes"
      | "materialId"
      | "styleRefIds"
      | "clientId"
      | "order"
      | "date"
    >
  >,
): Promise<DailyTask | undefined> {
  const data = await getData();
  const tasks = data.dailyTasks ?? [];
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  tasks[idx] = { ...tasks[idx], ...updates };
  data.dailyTasks = tasks;
  await persist(data);
  return tasks[idx];
}

export async function reorderDailyTasks(
  date: string,
  orderedIds: string[],
): Promise<void> {
  const data = await getData();
  const tasks = data.dailyTasks ?? [];
  orderedIds.forEach((id, index) => {
    const t = tasks.find((t) => t.id === id && t.date === date);
    if (t) t.order = index;
  });
  data.dailyTasks = tasks;
  await persist(data);
}

export async function deleteDailyTask(id: string): Promise<void> {
  const data = await getData();
  data.dailyTasks = (data.dailyTasks ?? []).filter((t) => t.id !== id);
  await persist(data);
}

export type { TaskStatus };
