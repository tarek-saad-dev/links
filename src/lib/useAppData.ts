"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, MaterialLink, AppData, SocialPlatform } from "./types";
import * as repo from "./repository";
import {
  loadData,
  syncToServer as syncToServerStorage,
  syncFromServer as syncFromServerStorage,
  syncFromDatabase as syncFromDatabaseStorage,
} from "./storage";
import { SEED_DATA } from "./seed";

export function useAppData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<MaterialLink[]>([]);
  const [ready, setReady] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const [c, m] = await Promise.all([repo.getClients(), repo.getMaterials()]);
    setClients(c);
    setMaterials(m);
  }, []);

  useEffect(() => {
    async function init() {
      // Try to load data (localStorage → server backup → seed)
      let data = await loadData();

      // If still empty, use seed data
      if (data.clients.length === 0 && data.materials.length === 0) {
        await repo.setAllData(SEED_DATA);
        data = SEED_DATA;
      }

      setClients(data.clients);
      setMaterials(data.materials);
      setReady(true);
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

  // Sync operations
  const syncToServer = useCallback(async () => {
    const result = await syncToServerStorage();
    if (result.db || result.json) {
      setLastSync(new Date());
    }
    return result;
  }, []);

  const syncFromServer = useCallback(async () => {
    const data = await syncFromServerStorage();
    if (data) {
      await refresh();
      setLastSync(new Date());
    }
    return data;
  }, [refresh]);

  const syncFromDatabase = useCallback(async () => {
    const data = await syncFromDatabaseStorage();
    if (data) {
      await refresh();
      setLastSync(new Date());
    }
    return data;
  }, [refresh]);

  // Auto-sync from database (polling every 10 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only auto-sync if user is active (page visible)
      if (document.visibilityState === "visible") {
        const dbData = await syncFromDatabaseStorage();
        if (dbData) {
          // Check if data actually changed by comparing counts
          const countChanged =
            clients.length !== dbData.clients.length ||
            materials.length !== dbData.materials.length;

          // Check by comparing latest material update timestamps (clients don't have updatedAt)
          const latestLocalMaterial = [...materials].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0];
          const latestDbMaterial = [...dbData.materials].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0];

          const timeChanged =
            latestLocalMaterial &&
            latestDbMaterial &&
            new Date(latestDbMaterial.updatedAt).getTime() >
              new Date(latestLocalMaterial.updatedAt).getTime();

          if (countChanged || timeChanged) {
            setClients(dbData.clients);
            setMaterials(dbData.materials);
            setLastSync(new Date());
          }
        }
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [clients.length, materials.length, clients, materials]);

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
    syncToServer,
    syncFromServer,
    syncFromDatabase,
    exportData,
    importData,
    addStyleRef,
    editStyleRef,
    removeStyleRef,
    refresh,
  };
}
