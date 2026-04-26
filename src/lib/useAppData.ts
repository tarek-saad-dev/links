"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Client,
  MaterialLink,
  AppData,
  SocialPlatform,
  DailyTask,
} from "./types";
import * as repo from "./repository";
import {
  loadData,
  syncFromDatabase as syncFromDatabaseStorage,
} from "./storage";

export function useAppData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<MaterialLink[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [ready, setReady] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const data = await loadData();
    setClients(data.clients);
    setMaterials(data.materials);
    setDailyTasks(data.dailyTasks ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      const data = await loadData();
      setClients(data.clients);
      setMaterials(data.materials);
      setDailyTasks(data.dailyTasks ?? []);
      setReady(true);

      // Rollover: move unfinished tasks from past days to today
      const today = new Date().toISOString().split("T")[0];
      const overdue = (data.dailyTasks ?? []).filter(
        (t) => t.date < today && t.status !== "done",
      );
      if (overdue.length > 0) {
        const todayTasksCount = (data.dailyTasks ?? []).filter(
          (t) => t.date === today,
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
    init();
  }, []);

  // Client operations
  const addClient = useCallback(
    async (
      input: Pick<Client, "name" | "notes"> & Partial<Pick<Client, "color">>,
    ) => {
      const c = await repo.createClient(input);
      await refresh();
      return c;
    },
    [refresh],
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

  // Material operations
  const addMaterial = useCallback(
    async (input: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">) => {
      const m = await repo.createMaterial(input);
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
      styleRefId?: string | null;
      notes?: string;
    }) => {
      const task = await repo.createDailyTask(input);
      await refresh();
      return task;
    },
    [refresh],
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
          | "styleRefId"
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

  const stats = {
    totalClients: clients.length,
    totalMaterials: materials.length,
    totalLibraries: materials.filter((m) => m.type === "library").length,
    totalFavorites: materials.filter((m) => m.isFavorite).length,
  };

  const allTags = Array.from(new Set(materials.flatMap((m) => m.tags))).sort();

  return {
    ready,
    clients,
    materials,
    dailyTasks,
    stats,
    allTags,
    lastSync,
    addClient,
    editClient,
    removeClient,
    addMaterial,
    editMaterial,
    removeMaterial,
    toggleFav,
    syncFromDatabase,
    exportData,
    importData,
    addStyleRef,
    editStyleRef,
    removeStyleRef,
    addDailyTask,
    editDailyTask,
    reorderTasks,
    removeDailyTask,
    refresh,
  };
}
