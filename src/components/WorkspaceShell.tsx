"use client";

import { useAppData } from "@/lib/useAppData";
import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Calendar, Users, Link2, LayoutDashboard, Plus, Trash2, Wallet, UserCircle, Lightbulb, Star, Library, FolderOpen, ChevronDown, X, Pencil, LayoutDashboard as DashboardIcon } from "lucide-react";
import Link from "next/link";
import DailyTasksPanel from "./DailyTasksPanel";
import TaskCalendar from "./TaskCalendar";
import Modal from "./Modal";
import ClientForm from "./ClientForm";
import MaterialForm from "./MaterialForm";
import WorkspaceSelector from "./WorkspaceSelector";
import type { Client, MaterialLink, MaterialType, SortOption } from "@/lib/types";
import { searchMatch } from "@/lib/utils";
import Badge from "./Badge";
import QuickAddForm from "./QuickAddForm";
import EmptyState from "./EmptyState";
import MaterialCard from "./MaterialCard";
import StyleRefsPanel from "./StyleRefsPanel";

type Tab = "dashboard" | "tasks" | "calendar" | "clients";

interface WorkspaceShellProps {
  workspaceId: string;
}

export default function WorkspaceShell({ workspaceId }: WorkspaceShellProps) {
  const {
    ready,
    pending,
    workspaces,
    activeWorkspaceId,
    selectWorkspace,
    addWorkspace,
    editWorkspace,
    removeWorkspace,
    clients,
    materials,
    dailyTasks,
    addClient,
    editClient,
    removeClient,
    addMaterial,
    editMaterial,
    removeMaterial,
    toggleFav,
    addDailyTask,
    editDailyTask,
    reorderTasks,
    removeDailyTask,
    addStyleRef,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [showClientModal, setShowClientModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialLink | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Dashboard filters
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState<MaterialType | "">("");
  const [filterFav, setFilterFav] = useState(false);
  const [sort, setSort] = useState<SortOption>("recently-added");
  const [dashboardClient, setDashboardClient] = useState<string>("");

  // Set active workspace when shell loads
  useState(() => {
    if (workspaceId !== activeWorkspaceId) {
      selectWorkspace(workspaceId);
    }
  });

  const workspace = workspaces.find((w) => w.id === workspaceId);

  // Filter data for current workspace
  const workspaceClients = clients.filter((c) => c.workspaceId === workspaceId);
  const workspaceMaterials = materials.filter((m) => m.workspaceId === workspaceId);
  const workspaceTasks = dailyTasks.filter((t) => t.workspaceId === workspaceId);

  // Stats for workspace
  const stats = useMemo(() => {
    const clientCount = workspaceClients.length;
    const materialCount = workspaceMaterials.length;
    const favoriteCount = workspaceMaterials.filter((m) => m.isFavorite).length;
    const pendingTaskCount = workspaceTasks.filter((t) => t.status !== "done").length;
    const libraryCount = workspaceMaterials.filter((m) => m.type === "library").length;

    return {
      totalClients: clientCount,
      totalMaterials: materialCount,
      totalFavorites: favoriteCount,
      pendingTasks: pendingTaskCount,
      totalLibraries: libraryCount,
    };
  }, [workspaceClients, workspaceMaterials, workspaceTasks]);

  // Quick filter chips
  const quickFilters = [
    { label: "المفضلة", icon: <Star size={14} />, active: filterFav, toggle: () => { setFilterFav(!filterFav); setFilterType(""); } },
    { label: "المكتبات", icon: <Library size={14} />, active: filterType === "library", toggle: () => { setFilterType(filterType === "library" ? "" : "library"); setFilterFav(false); } },
    { label: "الأخيرة", icon: <FolderOpen size={14} />, active: sort === "recently-added" && !filterFav && !filterType, toggle: () => { setSort("recently-added"); setFilterFav(false); setFilterType(""); } },
  ];

  // Filtered + sorted materials
  const filteredMaterials = useMemo(() => {
    let result = [...workspaceMaterials];

    if (search) {
      result = result.filter((m) => {
        const client = workspaceClients.find((c) => c.id === m.clientId);
        return searchMatch(
          search,
          m.title,
          client?.name ?? "",
          m.description,
          m.tags.join(" "),
          m.shootDate
        );
      });
    }

    if (filterClient) result = result.filter((m) => m.clientId === filterClient);
    if (filterType) result = result.filter((m) => m.type === filterType);
    if (filterFav) result = result.filter((m) => m.isFavorite);

    switch (sort) {
      case "newest-shoot":
        result.sort((a, b) => (b.shootDate || "").localeCompare(a.shootDate || ""));
        break;
      case "oldest-shoot":
        result.sort((a, b) => (a.shootDate || "").localeCompare(b.shootDate || ""));
        break;
      case "recently-added":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "alphabetical":
        result.sort((a, b) => a.title.localeCompare(b.title, "ar"));
        break;
    }

    return result;
  }, [workspaceMaterials, workspaceClients, search, filterClient, filterType, filterFav, sort]);

  // Dashboard materials: filter by selected client, sort by fav first then date
  const dashboardMaterials = useMemo(() => {
    let result = [...workspaceMaterials];

    if (dashboardClient) {
      result = result.filter((m) => m.clientId === dashboardClient);
    }

    result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      const dateA = a.shootDate || a.createdAt;
      const dateB = b.shootDate || b.createdAt;
      return dateB.localeCompare(dateA);
    });

    return result;
  }, [workspaceMaterials, dashboardClient]);

  const handleClientSubmit = useCallback(
    async (data: { name: string; notes: string; color: string }) => {
      if (editingClient) {
        await editClient(editingClient.id, data);
        setEditingClient(null);
      } else {
        await addClient(data);
      }
      setShowClientModal(false);
    },
    [addClient, editClient, editingClient]
  );

  const handleAddMaterial = useCallback(
    async (data: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">) => {
      await addMaterial({ ...data, workspaceId });
      setShowMaterialModal(false);
    },
    [addMaterial, workspaceId]
  );

  const handleEditMaterial = useCallback(
    async (data: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">) => {
      if (editingMaterial) {
        await editMaterial(editingMaterial.id, data);
        setEditingMaterial(null);
        setShowMaterialModal(false);
      }
    },
    [editMaterial, editingMaterial]
  );

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Workspace غير موجود</h1>
          <Link href="/" className="text-indigo-600 hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700"
              >
                <ArrowLeft size={20} />
                <span className="text-sm">الرجوع</span>
              </Link>
              <div className="h-6 w-px bg-zinc-200" />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: workspace.color }}
                />
                <h1 className="text-xl font-bold text-zinc-900">{workspace.name}</h1>
                {/* Type Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${workspace.type === "salary"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : workspace.type === "freelance"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                  {workspace.type === "salary" && <Wallet size={12} />}
                  {workspace.type === "freelance" && <UserCircle size={12} />}
                  {workspace.type === "opportunity" && <Lightbulb size={12} />}
                  {workspace.type === "salary" && "راتب شهري"}
                  {workspace.type === "freelance" && "فريلانس"}
                  {workspace.type === "opportunity" && "فرصة مستقبلية"}
                </span>
              </div>
            </div>

            <WorkspaceSelector
              workspaces={workspaces}
              activeWorkspaceId={workspaceId}
              onSelect={(id) => {
                window.location.href = `/workspace/${id}`;
              }}
              onAdd={addWorkspace}
              onEdit={editWorkspace}
              onDelete={removeWorkspace}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { key: "dashboard" as Tab, label: "الرئيسية", icon: <DashboardIcon size={16} /> },
              { key: "tasks" as Tab, label: "تاسكات اليوم", icon: <Calendar size={16} /> },
              { key: "calendar" as Tab, label: "كالندر", icon: <LayoutDashboard size={16} /> },
              { key: "clients" as Tab, label: "العملاء", icon: <Users size={16} /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "العملاء", value: stats.totalClients, icon: <Users size={20} />, color: "text-blue-600 bg-blue-50" },
                { label: "الماتريال", value: stats.totalMaterials, icon: <Link2 size={20} />, color: "text-indigo-600 bg-indigo-50" },
                { label: "المكتبات", value: stats.totalLibraries, icon: <Library size={20} />, color: "text-emerald-600 bg-emerald-50" },
                { label: "المفضلة", value: stats.totalFavorites, icon: <Star size={20} />, color: "text-rose-600 bg-rose-50" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-zinc-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
                    <div className={`p-1.5 rounded-lg ${s.color}`}>{s.icon}</div>
                  </div>
                  <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Add */}
            <QuickAddForm
              clients={workspaceClients}
              onAdd={async (data) => {
                await addMaterial({ ...data, workspaceId });
              }}
            />

            {/* Client Filter - Main Dashboard Filter */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                اختار العميل
              </label>
              <select
                value={dashboardClient}
                onChange={(e) => setDashboardClient(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              >
                <option value="">كل العملاء</option>
                {workspaceClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {dashboardClient && (
                <button
                  onClick={() => setDashboardClient("")}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1"
                >
                  <X size={12} />
                  إلغاء التحديد
                </button>
              )}
            </div>

            {/* Materials Section - Sorted by fav first, then date */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  {dashboardClient ? (
                    <>
                      <span>ماتريال</span>
                      <Badge variant="project">
                        {workspaceClients.find(c => c.id === dashboardClient)?.name}
                      </Badge>
                    </>
                  ) : (
                    "كل الماتريال"
                  )}
                  <span className="text-zinc-400 font-normal">
                    ({dashboardMaterials.length})
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Star size={14} className="text-amber-500" />
                  <span>المفضلة أولاً</span>
                </div>
              </div>

              {dashboardMaterials.length === 0 ? (
                <EmptyState
                  title={dashboardClient ? "لا توجد ماتريال لهذا العميل" : "لا توجد ماتريال"}
                  description={dashboardClient ? "أضف ماتريال جديدة لهذا العميل" : "أضف أول لينك ماتريال من فورم الإضافة السريعة"}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dashboardMaterials.map((m) => (
                    <MaterialCard
                      key={m.id}
                      material={m}
                      client={workspaceClients.find((c) => c.id === m.clientId)}
                      onEdit={(mat) => { setEditingMaterial(mat); setShowMaterialModal(true); }}
                      onDelete={(id) => removeMaterial(id)}
                      onToggleFav={toggleFav}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="max-w-2xl mx-auto">
            <DailyTasksPanel
              tasks={workspaceTasks}
              clients={workspaceClients}
              materials={workspaceMaterials}
              activeWorkspaceId={workspaceId}
              onAdd={addDailyTask}
              onEdit={editDailyTask}
              onReorder={reorderTasks}
              onDelete={removeDailyTask}
              onAddMaterial={addMaterial}
              onAddStyleRef={addStyleRef}
            />
          </div>
        )}

        {tab === "calendar" && (
          <TaskCalendar
            tasks={workspaceTasks}
            clients={workspaceClients}
            onAdd={addDailyTask}
            onEdit={editDailyTask}
          />
        )}

        {tab === "clients" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">العملاء</h2>
              <button
                onClick={() => { setEditingClient(null); setShowClientModal(true); }}
                disabled={pending.addClient}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending.addClient ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                إضافة عميل
              </button>
            </div>

            {workspaceClients.length === 0 ? (
              <EmptyState
                icon={<Users size={40} />}
                title="لا يوجد عملاء"
                description="أضف أول عميل لتبدأ تنظيم الماتريال"
                action={
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    إضافة عميل
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {workspaceClients.map((client) => {
                  const clientMaterials = workspaceMaterials.filter((m) => m.clientId === client.id);
                  const libCount = clientMaterials.filter((m) => m.type === "library").length;
                  const isExpanded = selectedClientId === client.id;

                  return (
                    <div key={client.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                        onClick={() => setSelectedClientId(isExpanded ? null : client.id)}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: client.color }}
                        >
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-900 text-sm">{client.name}</h3>
                          {client.notes && (
                            <p className="text-xs text-zinc-400 truncate">{client.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span>{clientMaterials.length} لينك</span>
                          {libCount > 0 && (
                            <Badge variant="library">{libCount} مكتبة</Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingClient(client); setShowClientModal(true); }}
                              disabled={pending.editClient}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            >
                              {pending.editClient ? (
                                <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin inline-block" />
                              ) : (
                                <Pencil size={14} />
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeClient(client.id); }}
                              disabled={pending.removeClient}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            >
                              {pending.removeClient ? (
                                <span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-rose-500 rounded-full animate-spin inline-block" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                          <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-zinc-100 p-4 bg-zinc-50/50">
                          {clientMaterials.length === 0 ? (
                            <p className="text-sm text-zinc-400 text-center py-4">لا توجد ماتريال لهذا العميل</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {clientMaterials.map((m) => (
                                <MaterialCard
                                  key={m.id}
                                  material={m}
                                  client={client}
                                  onEdit={(mat) => { setEditingMaterial(mat); setShowMaterialModal(true); }}
                                  onDelete={(id) => removeMaterial(id)}
                                  onToggleFav={toggleFav}
                                  pending={pending}
                                />
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingMaterial(null);
                              setShowMaterialModal(true);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Plus size={14} />
                            إضافة ماتريال لـ {client.name}
                          </button>
                          <StyleRefsPanel
                            clientId={client.id}
                            styleRefs={client.styleRefs}
                            onAdd={async (input) => {
                              await addStyleRef(client.id, input);
                            }}
                            onEdit={async () => { }}
                            onDelete={async () => { }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Client Modal */}
      <Modal
        open={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        title={editingClient ? "تعديل عميل" : "إضافة عميل"}
      >
        <ClientForm
          client={editingClient}
          onSubmit={handleClientSubmit}
          onCancel={() => {
            setShowClientModal(false);
            setEditingClient(null);
          }}
          pending={pending.addClient || pending.editClient}
        />
      </Modal>

      {/* Material Modal */}
      <Modal
        open={showMaterialModal}
        onClose={() => {
          setShowMaterialModal(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? "تعديل ماتريال" : "إضافة ماتريال"}
      >
        <MaterialForm
          material={editingMaterial}
          clients={workspaceClients}
          defaultClientId={selectedClientId ?? undefined}
          workspaceId={workspaceId}
          onSubmit={editingMaterial ? handleEditMaterial : handleAddMaterial}
          onCancel={() => {
            setShowMaterialModal(false);
            setEditingMaterial(null);
          }}
          pending={pending.addMaterial || pending.editMaterial}
        />
      </Modal>
    </div>
  );
}
