"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Client,
  MaterialLink,
  AppData,
  SocialPlatform,
  DailyTask,
  Workspace,
} from "./types";
import * as repo from "./repository";
import {
  loadData,
  syncFromDatabase as syncFromDatabaseStorage,
} from "./storage";

const ACTIVE_WORKSPACE_KEY = "activeWorkspaceId";

export function useAppData() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<MaterialLink[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [ready, setReady] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Pending states for async operations to prevent double-clicks
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const withPending = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      key: string,
      fn: T,
    ) => {
      return (...args: Parameters<T>): ReturnType<T> => {
        if (pending[key]) return undefined as ReturnType<T>;
        setPending((p) => ({ ...p, [key]: true }));
        return fn(...args).finally(() => {
          setPending((p) => ({ ...p, [key]: false }));
        }) as ReturnType<T>;
      };
    },
    [pending],
  );

  // Filtered data by active workspace (sorted by order)
  const workspaceClients = clients
    .filter((c) => c.workspaceId === activeWorkspaceId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const workspaceMaterials = materials
    .filter((m) => m.workspaceId === activeWorkspaceId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const workspaceTasks = dailyTasks.filter(
    (t) => t.workspaceId === activeWorkspaceId,
  );

  const refresh = useCallback(async () => {
    const data = await loadData();
    setWorkspaces(data.workspaces ?? []);
    setClients(data.clients);
    setMaterials(data.materials);
    setDailyTasks(data.dailyTasks ?? []);
  }, []);

  const selectWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  }, []);

  useEffect(() => {
    async function init() {
      const data = await loadData();

      // Migrate: ensure workspaces exist
      let ws = data.workspaces ?? [];
      if (ws.length === 0) {
        // Create default workspace and assign all existing data to it
        const defaultWs: Workspace = {
          id: crypto.randomUUID(),
          name: "BlackIce",
          color: "#6366f1",
          type: "freelance",
          isActive: true,
          order: 0,
          createdAt: new Date().toISOString(),
        };
        ws = [defaultWs];

        // Update all existing data with workspaceId
        const updatedClients = data.clients.map((c) => ({
          ...c,
          workspaceId: defaultWs.id,
        }));
        const updatedMaterials = data.materials.map((m) => ({
          ...m,
          workspaceId: defaultWs.id,
        }));
        const updatedTasks = (data.dailyTasks ?? []).map((t) => ({
          ...t,
          workspaceId: defaultWs.id,
        }));

        await repo.setAllData({
          workspaces: ws,
          clients: updatedClients,
          materials: updatedMaterials,
          dailyTasks: updatedTasks,
        });
      }

      setWorkspaces(ws);
      setClients(data.clients);
      setMaterials(data.materials);
      setDailyTasks(data.dailyTasks ?? []);

      // Load active workspace from localStorage or use first one
      const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const active = ws.find((w) => w.id === saved) || ws[0] || null;
      setActiveWorkspaceId(active?.id ?? null);

      setReady(true);

      // Rollover: move unfinished tasks from past days to today (only for active workspace)
      const today = new Date().toISOString().split("T")[0];
      const activeWsId = active?.id;
      if (activeWsId) {
        const overdue = (data.dailyTasks ?? []).filter(
          (t) =>
            t.workspaceId === activeWsId &&
            t.date < today &&
            t.status !== "done",
        );
        if (overdue.length > 0) {
          const todayTasksCount = (data.dailyTasks ?? []).filter(
            (t) => t.workspaceId === activeWsId && t.date === today,
          ).length;
          await Promise.all(
            overdue.map((t, i) =>
              repo.updateDailyTask(t.id, {
                date: today,
                order: todayTasksCount + i,
              }),
            ),
          );
          const updated = await loadData();
          setDailyTasks(updated.dailyTasks ?? []);
        }
      }
    }
    init();
  }, []);

  // Client operations
  const addClient = useCallback(
    async (
      input: Pick<Client, "name" | "notes"> & Partial<Pick<Client, "color">>,
    ) => {
      if (!activeWorkspaceId) throw new Error("No active workspace");
      const c = await repo.createClient({
        ...input,
        workspaceId: activeWorkspaceId,
      });
      await refresh();
      return c;
    },
    [refresh, activeWorkspaceId],
  );

  const editClient = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Client, "name" | "notes" | "color">>,
    ) => {
      const c = await repo.updateClient(id, updates);
      await refresh();
      return c;
    },
    [refresh],
  );

  const removeClient = useCallback(
    async (id: string) => {
      await repo.deleteClient(id);
      await refresh();
    },
    [refresh],
  );

  const reorderClients = useCallback(
    async (orderedIds: string[]) => {
      const data = await repo.getAllData();
      orderedIds.forEach((id, index) => {
        const idx = data.clients.findIndex((c) => c.id === id);
        if (idx !== -1) {
          data.clients[idx].order = index;
        }
      });
      await repo.setAllData(data);
      await refresh();
    },
    [refresh],
  );

  // Material operations
  const addMaterial = useCallback(
    async (
      input: Omit<MaterialLink, "id" | "createdAt" | "updatedAt" | "order"> & {
        order?: number;
      },
    ) => {
      const data = await repo.getAllData();
      const clientMaterials = data.materials.filter(
        (m) => m.clientId === input.clientId,
      );
      const maxOrder =
        clientMaterials.length > 0
          ? Math.max(...clientMaterials.map((m) => m.order ?? 0))
          : -1;
      const m = await repo.createMaterial({
        ...input,
        order: input.order ?? maxOrder + 1,
      });
      await refresh();
      return m;
    },
    [refresh],
  );

  const editMaterial = useCallback(
    async (
      id: string,
      updates: Partial<Omit<MaterialLink, "id" | "createdAt">>,
    ) => {
      const m = await repo.updateMaterial(id, updates);
      await refresh();
      return m;
    },
    [refresh],
  );

  const removeMaterial = useCallback(
    async (id: string) => {
      await repo.deleteMaterial(id);
      await refresh();
    },
    [refresh],
  );

  const reorderMaterials = useCallback(
    async (orderedIds: string[]) => {
      const data = await repo.getAllData();
      orderedIds.forEach((id, index) => {
        const idx = data.materials.findIndex((m) => m.id === id);
        if (idx !== -1) {
          data.materials[idx].order = index;
        }
      });
      await repo.setAllData(data);
      await refresh();
    },
    [refresh],
  );

  const toggleFav = useCallback(
    async (id: string) => {
      await repo.toggleFavorite(id);
      await refresh();
    },
    [refresh],
  );

  // Pull latest from DB and refresh UI
  const syncFromDatabase = useCallback(async () => {
    const data = await syncFromDatabaseStorage();
    if (data) {
      await refresh();
      setLastSync(new Date());
    }
    return data;
  }, [refresh]);

  // Style Refs
  const addStyleRef = useCallback(
    async (
      clientId: string,
      input: { platform: SocialPlatform; url: string; note?: string },
    ) => {
      const ref = await repo.addStyleRef(clientId, input);
      await refresh();
      return ref;
    },
    [refresh],
  );

  const editStyleRef = useCallback(
    async (
      clientId: string,
      refId: string,
      updates: { platform?: SocialPlatform; url?: string; note?: string },
    ) => {
      const ref = await repo.updateStyleRef(clientId, refId, updates);
      await refresh();
      return ref;
    },
    [refresh],
  );

  const removeStyleRef = useCallback(
    async (clientId: string, refId: string) => {
      await repo.deleteStyleRef(clientId, refId);
      await refresh();
    },
    [refresh],
  );

  // Daily Task operations
  const addDailyTask = useCallback(
    async (input: {
      title: string;
      clientId: string;
      date: string;
      materialId?: string | null;
      styleRefIds?: string[];
      notes?: string;
    }) => {
      if (!activeWorkspaceId) throw new Error("No active workspace");
      const task = await repo.createDailyTask({
        ...input,
        workspaceId: activeWorkspaceId,
      });
      await refresh();
      return task;
    },
    [refresh, activeWorkspaceId],
  );

  const editDailyTask = useCallback(
    async (
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
    ) => {
      const task = await repo.updateDailyTask(id, updates);
      await refresh();
      return task;
    },
    [refresh],
  );

  const reorderTasks = useCallback(
    async (date: string, orderedIds: string[]) => {
      await repo.reorderDailyTasks(date, orderedIds);
      await refresh();
    },
    [refresh],
  );

  const removeDailyTask = useCallback(
    async (id: string) => {
      await repo.deleteDailyTask(id);
      await refresh();
    },
    [refresh],
  );

  // Import / Export
  const exportData = useCallback(async (): Promise<string> => {
    const data = await repo.getAllData();
    return JSON.stringify(data, null, 2);
  }, []);

  const importData = useCallback(
    async (json: string) => {
      const data = JSON.parse(json) as AppData;
      if (!Array.isArray(data.clients) || !Array.isArray(data.materials)) {
        throw new Error("ملف غير صالح");
      }
      await repo.setAllData(data);
      await refresh();
    },
    [refresh],
  );

  // Workspace operations
  const addWorkspace = useCallback(
    async (input: {
      name: string;
      color: string;
      description?: string;
      type?: Workspace["type"];
      order?: number;
    }) => {
      const data = await repo.getAllData();
      const workspaces = data.workspaces ?? [];
      const maxOrder =
        workspaces.length > 0
          ? Math.max(...workspaces.map((w) => w.order ?? 0))
          : -1;
      const newWs: Workspace = {
        id: crypto.randomUUID(),
        name: input.name,
        color: input.color,
        description: input.description,
        type: input.type ?? "freelance",
        isActive: true,
        order: input.order ?? maxOrder + 1,
        createdAt: new Date().toISOString(),
      };
      data.workspaces = [...workspaces, newWs];
      await repo.setAllData(data);
      await refresh();
      return newWs;
    },
    [refresh],
  );

  const editWorkspace = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<Workspace, "name" | "color" | "type" | "isActive" | "order">
      >,
    ) => {
      const data = await repo.getAllData();
      const idx = (data.workspaces ?? []).findIndex((w) => w.id === id);
      if (idx === -1) return undefined;
      (data.workspaces ?? [])[idx] = {
        ...(data.workspaces ?? [])[idx],
        ...updates,
      };
      await repo.setAllData(data);
      await refresh();
      return (data.workspaces ?? [])[idx];
    },
    [refresh],
  );

  const reorderWorkspaces = useCallback(
    async (orderedIds: string[]) => {
      const data = await repo.getAllData();
      const ws = data.workspaces ?? [];
      orderedIds.forEach((id, index) => {
        const idx = ws.findIndex((w) => w.id === id);
        if (idx !== -1) {
          ws[idx].order = index;
        }
      });
      await repo.setAllData(data);
      await refresh();
    },
    [refresh],
  );

  const removeWorkspace = useCallback(
    async (id: string) => {
      const data = await repo.getAllData();
      data.workspaces = (data.workspaces ?? []).filter((w) => w.id !== id);
      // Also delete all related data
      data.clients = data.clients.filter((c) => c.workspaceId !== id);
      data.materials = data.materials.filter((m) => m.workspaceId !== id);
      data.dailyTasks = (data.dailyTasks ?? []).filter(
        (t) => t.workspaceId !== id,
      );
      await repo.setAllData(data);
      await refresh();
      if (activeWorkspaceId === id) {
        const remaining = data.workspaces ?? [];
        if (remaining.length > 0) {
          selectWorkspace(remaining[0].id);
        } else {
          setActiveWorkspaceId(null);
          localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
        }
      }
    },
    [refresh, activeWorkspaceId, selectWorkspace],
  );

  const stats = {
    totalClients: workspaceClients.length,
    totalMaterials: workspaceMaterials.length,
    totalLibraries: workspaceMaterials.filter((m) => m.type === "library")
      .length,
    totalFavorites: workspaceMaterials.filter((m) => m.isFavorite).length,
    totalTasks: workspaceTasks.length,
    pendingTasks: workspaceTasks.filter((t) => t.status !== "done").length,
  };

  const allTags = Array.from(
    new Set(workspaceMaterials.flatMap((m) => m.tags)),
  ).sort();

  // Wrapped operations with pending state
  const wrappedAddWorkspace = useCallback(
    (input: Parameters<typeof addWorkspace>[0]) =>
      withPending("addWorkspace", () => addWorkspace(input))(),
    [addWorkspace, withPending],
  );
  const wrappedEditWorkspace = useCallback(
    (id: string, updates: Parameters<typeof editWorkspace>[1]) =>
      withPending("editWorkspace", () => editWorkspace(id, updates))(),
    [editWorkspace, withPending],
  );
  const wrappedReorderWorkspaces = useCallback(
    (orderedIds: string[]) =>
      withPending("reorderWorkspaces", () => reorderWorkspaces(orderedIds))(),
    [reorderWorkspaces, withPending],
  );
  const wrappedRemoveWorkspace = useCallback(
    (id: string) => withPending("removeWorkspace", () => removeWorkspace(id))(),
    [removeWorkspace, withPending],
  );
  const wrappedAddClient = useCallback(
    (input: Parameters<typeof addClient>[0]) =>
      withPending("addClient", () => addClient(input))(),
    [addClient, withPending],
  );
  const wrappedEditClient = useCallback(
    (id: string, updates: Parameters<typeof editClient>[1]) =>
      withPending("editClient", () => editClient(id, updates))(),
    [editClient, withPending],
  );
  const wrappedRemoveClient = useCallback(
    (id: string) => withPending("removeClient", () => removeClient(id))(),
    [removeClient, withPending],
  );
  const wrappedReorderClients = useCallback(
    (orderedIds: string[]) =>
      withPending("reorderClients", () => reorderClients(orderedIds))(),
    [reorderClients, withPending],
  );
  const wrappedAddMaterial = useCallback(
    (input: Parameters<typeof addMaterial>[0]) =>
      withPending("addMaterial", () => addMaterial(input))(),
    [addMaterial, withPending],
  );
  const wrappedEditMaterial = useCallback(
    (id: string, updates: Parameters<typeof editMaterial>[1]) =>
      withPending("editMaterial", () => editMaterial(id, updates))(),
    [editMaterial, withPending],
  );
  const wrappedRemoveMaterial = useCallback(
    (id: string) => withPending("removeMaterial", () => removeMaterial(id))(),
    [removeMaterial, withPending],
  );
  const wrappedReorderMaterials = useCallback(
    (orderedIds: string[]) =>
      withPending("reorderMaterials", () => reorderMaterials(orderedIds))(),
    [reorderMaterials, withPending],
  );
  const wrappedToggleFav = useCallback(
    (id: string) => withPending("toggleFav", () => toggleFav(id))(),
    [toggleFav, withPending],
  );
  const wrappedAddDailyTask = useCallback(
    (input: Parameters<typeof addDailyTask>[0]) =>
      withPending("addDailyTask", () => addDailyTask(input))(),
    [addDailyTask, withPending],
  );
  const wrappedEditDailyTask = useCallback(
    (id: string, updates: Parameters<typeof editDailyTask>[1]) =>
      withPending("editDailyTask", () => editDailyTask(id, updates))(),
    [editDailyTask, withPending],
  );
  const wrappedReorderTasks = useCallback(
    (date: string, orderedIds: string[]) =>
      withPending("reorderTasks", () => reorderTasks(date, orderedIds))(),
    [reorderTasks, withPending],
  );
  const wrappedRemoveDailyTask = useCallback(
    (id: string) => withPending("removeDailyTask", () => removeDailyTask(id))(),
    [removeDailyTask, withPending],
  );
  const wrappedAddStyleRef = useCallback(
    (clientId: string, input: Parameters<typeof addStyleRef>[1]) =>
      withPending("addStyleRef", () => addStyleRef(clientId, input))(),
    [addStyleRef, withPending],
  );

  // Sort workspaces by order
  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [workspaces],
  );

  return {
    ready,
    pending,
    workspaces: sortedWorkspaces,
    activeWorkspaceId,
    selectWorkspace,
    addWorkspace: wrappedAddWorkspace,
    editWorkspace: wrappedEditWorkspace,
    reorderWorkspaces: wrappedReorderWorkspaces,
    removeWorkspace: wrappedRemoveWorkspace,
    // Filtered data for current workspace
    clients: workspaceClients,
    materials: workspaceMaterials,
    dailyTasks: workspaceTasks,
    // Raw data (for special cases)
    allClients: clients,
    allMaterials: materials,
    allDailyTasks: dailyTasks,
    stats,
    allTags,
    lastSync,
    addClient: wrappedAddClient,
    editClient: wrappedEditClient,
    removeClient: wrappedRemoveClient,
    reorderClients: wrappedReorderClients,
    addMaterial: wrappedAddMaterial,
    editMaterial: wrappedEditMaterial,
    removeMaterial: wrappedRemoveMaterial,
    reorderMaterials: wrappedReorderMaterials,
    toggleFav: wrappedToggleFav,
    syncFromDatabase,
    exportData,
    importData,
    addStyleRef: wrappedAddStyleRef,
    editStyleRef,
    removeStyleRef,
    addDailyTask: wrappedAddDailyTask,
    editDailyTask: wrappedEditDailyTask,
    reorderTasks: wrappedReorderTasks,
    removeDailyTask: wrappedRemoveDailyTask,
    refresh,
  };
}
