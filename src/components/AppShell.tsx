"use client";

import { useState, useMemo, useRef } from "react";
import { useAppData } from "@/lib/useAppData";
import type { MaterialLink, MaterialType, SortOption, Client } from "@/lib/types";
import { searchMatch } from "@/lib/utils";
import Modal from "./Modal";
import ClientForm from "./ClientForm";
import MaterialForm from "./MaterialForm";
import MaterialCard from "./MaterialCard";
import QuickAddForm from "./QuickAddForm";
import EmptyState from "./EmptyState";
import Badge from "./Badge";
import StyleRefsPanel from "./StyleRefsPanel";
import DailyTasksPanel from "./DailyTasksPanel";
import TaskCalendar from "./TaskCalendar";
import WorkspaceSelector from "./WorkspaceSelector";
import {
  Search,
  Users,
  Link2,
  Library,
  Star,
  Plus,
  LayoutDashboard,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  CalendarDays,
  Calendar,
} from "lucide-react";

type Tab = "dashboard" | "clients" | "materials" | "tasks" | "calendar";

export default function AppShell() {
  const {
    ready,
    workspaces,
    activeWorkspaceId,
    selectWorkspace,
    addWorkspace,
    editWorkspace,
    removeWorkspace,
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
    syncFromDatabase,
    importData,
    addStyleRef,
    editStyleRef,
    removeStyleRef,
    dailyTasks,
    addDailyTask,
    editDailyTask,
    reorderTasks,
    removeDailyTask,
  } = useAppData();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState<MaterialType | "">("");
  const [filterFav, setFilterFav] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [sort, setSort] = useState<SortOption>("recently-added");
  const [showFilters, setShowFilters] = useState(false);

  // Dashboard-specific client filter
  const [dashboardClient, setDashboardClient] = useState<string>("");

  // Modals
  const [clientModal, setClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [materialModal, setMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialLink | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "client" | "material"; id: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick filter chips
  const quickFilters = [
    { label: "المفضلة", icon: <Star size={14} />, active: filterFav, toggle: () => { setFilterFav(!filterFav); setFilterType(""); setFilterTag(""); } },
    { label: "المكتبات", icon: <Library size={14} />, active: filterType === "library", toggle: () => { setFilterType(filterType === "library" ? "" : "library"); setFilterFav(false); setFilterTag(""); } },
    { label: "الأخيرة", icon: <FolderOpen size={14} />, active: sort === "recently-added" && !filterFav && !filterType && !filterTag, toggle: () => { setSort("recently-added"); setFilterFav(false); setFilterType(""); setFilterTag(""); } },
    { label: "بدون تاجات", icon: <Tag size={14} />, active: filterTag === "__none__", toggle: () => { setFilterTag(filterTag === "__none__" ? "" : "__none__"); setFilterFav(false); setFilterType(""); } },
  ];

  // Filtered + sorted materials
  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    if (search) {
      result = result.filter((m) => {
        const client = clients.find((c) => c.id === m.clientId);
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
    if (filterTag === "__none__") {
      result = result.filter((m) => m.tags.length === 0);
    } else if (filterTag) {
      result = result.filter((m) => m.tags.includes(filterTag));
    }

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
  }, [materials, clients, search, filterClient, filterType, filterFav, filterTag, sort]);

  // Client-filtered materials for client view
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Dashboard materials: filter by selected client, sort by fav first then date
  const dashboardMaterials = useMemo(() => {
    let result = [...materials];

    // Filter by selected client if any
    if (dashboardClient) {
      result = result.filter((m) => m.clientId === dashboardClient);
    }

    // Sort: favorites first, then by shoot date (newest), then created date
    result.sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      // Then by shoot date (newest first)
      const dateA = a.shootDate || a.createdAt;
      const dateB = b.shootDate || b.createdAt;
      return dateB.localeCompare(dateA);
    });

    return result;
  }, [materials, dashboardClient]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await importData(reader.result as string);
      } catch {
        alert("ملف غير صالح. تأكد إنه ملف JSON من التطبيق.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "client") await removeClient(deleteConfirm.id);
    else await removeMaterial(deleteConfirm.id);
    setDeleteConfirm(null);
  }

  function clearFilters() {
    setSearch("");
    setFilterClient("");
    setFilterType("");
    setFilterFav(false);
    setFilterTag("");
    setSort("recently-added");
  }

  const hasActiveFilters = search || filterClient || filterType || filterFav || filterTag;

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-lg font-bold text-zinc-900">أرشيف الماتريال</h1>
              <p className="text-xs text-zinc-400 -mt-0.5 hidden sm:block">
                تنظيم واسترجاع لينكات الشغل بسرعة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={async () => {
                    const data = await syncFromDatabase();
                    if (!data) alert("تعذّر الاتصال بقاعدة البيانات");
                  }}
                  className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  title="تحديث من قاعدة البيانات"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              {lastSync && (
                <span className="hidden sm:inline text-xs text-zinc-400">
                  آخر sync: {lastSync.toLocaleTimeString("ar-EG")}
                </span>
              )}
            </div>
          </div>
          {/* Workspace Selector + Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 -mb-px">
              {([
                { key: "dashboard" as Tab, label: "الرئيسية", icon: <LayoutDashboard size={16} /> },
                { key: "tasks" as Tab, label: "تاسكات اليوم", icon: <CalendarDays size={16} /> },
                { key: "calendar" as Tab, label: "كالندر", icon: <Calendar size={16} /> },
                { key: "clients" as Tab, label: "العملاء", icon: <Users size={16} /> },
                { key: "materials" as Tab, label: "الماتريال", icon: <Link2 size={16} /> },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setSelectedClientId(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                    }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <WorkspaceSelector
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={selectWorkspace}
              onAdd={addWorkspace}
              onEdit={editWorkspace}
              onDelete={removeWorkspace}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "العملاء", value: stats.totalClients, icon: <Users size={20} />, color: "text-indigo-600 bg-indigo-50" },
                { label: "الماتريال", value: stats.totalMaterials, icon: <Link2 size={20} />, color: "text-blue-600 bg-blue-50" },
                { label: "المكتبات", value: stats.totalLibraries, icon: <Library size={20} />, color: "text-amber-600 bg-amber-50" },
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
              clients={clients}
              onAdd={async (data) => {
                if (!activeWorkspaceId) return;
                await addMaterial({ ...data, workspaceId: activeWorkspaceId });
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
                {clients.map((c) => (
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
                        {clients.find(c => c.id === dashboardClient)?.name}
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
                      client={clients.find((c) => c.id === m.clientId)}
                      onEdit={(mat) => { setEditingMaterial(mat); setMaterialModal(true); }}
                      onDelete={(id) => setDeleteConfirm({ type: "material", id })}
                      onToggleFav={toggleFav}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CLIENTS ─── */}
        {tab === "clients" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">العملاء</h2>
              <button
                onClick={() => { setEditingClient(null); setClientModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                إضافة عميل
              </button>
            </div>

            {clients.length === 0 ? (
              <EmptyState
                icon={<Users size={40} />}
                title="لا يوجد عملاء"
                description="أضف أول عميل لتبدأ تنظيم الماتريال"
                action={
                  <button
                    onClick={() => setClientModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    إضافة عميل
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {clients.map((client) => {
                  const clientMaterials = materials.filter((m) => m.clientId === client.id);
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
                              onClick={(e) => { e.stopPropagation(); setEditingClient(client); setClientModal(true); }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "client", id: client.id }); }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} />
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
                                  onEdit={(mat) => { setEditingMaterial(mat); setMaterialModal(true); }}
                                  onDelete={(id) => setDeleteConfirm({ type: "material", id })}
                                  onToggleFav={toggleFav}
                                />
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingMaterial(null);
                              setMaterialModal(true);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Plus size={14} />
                            إضافة ماتريال لـ {client.name}
                          </button>
                          <StyleRefsPanel
                            clientId={client.id}
                            refs={client.styleRefs ?? []}
                            onAdd={async (input) => { await addStyleRef(client.id, input); }}
                            onEdit={async (refId, updates) => { await editStyleRef(client.id, refId, updates); }}
                            onDelete={(refId) => removeStyleRef(client.id, refId)}
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

        {/* ─── MATERIALS ─── */}
        {tab === "materials" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">كل الماتريال</h2>
              <button
                onClick={() => { setEditingMaterial(null); setMaterialModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                إضافة ماتريال
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="دوّر باسم العميل، اسم الماتريال، تاج، أو تاريخ تصوير"
                className="w-full pe-10 ps-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2">
              {quickFilters.map((qf) => (
                <button
                  key={qf.label}
                  onClick={qf.toggle}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${qf.active
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    }`}
                >
                  {qf.icon}
                  {qf.label}
                </button>
              ))}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${showFilters
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  }`}
              >
                <SlidersHorizontal size={14} />
                فلاتر متقدمة
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all"
                >
                  <X size={12} />
                  مسح الفلاتر
                </button>
              )}
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-zinc-200 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">العميل</label>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  >
                    <option value="">الكل</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">النوع</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as MaterialType | "")}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  >
                    <option value="">الكل</option>
                    <option value="project">مشروع</option>
                    <option value="library">مكتبة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">تاج</label>
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  >
                    <option value="">الكل</option>
                    {allTags.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">ترتيب</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                  >
                    <option value="recently-added">الأحدث إضافة</option>
                    <option value="newest-shoot">أحدث تصوير</option>
                    <option value="oldest-shoot">أقدم تصوير</option>
                    <option value="alphabetical">أبجدي</option>
                  </select>
                </div>
              </div>
            )}

            {/* Results count */}
            <p className="text-xs text-zinc-400">
              {filteredMaterials.length} نتيجة
            </p>

            {/* Materials grid */}
            {filteredMaterials.length === 0 ? (
              <EmptyState
                icon={<Link2 size={40} />}
                title="لا توجد ماتريال"
                description={hasActiveFilters ? "جرّب فلاتر مختلفة" : "أضف أول لينك ماتريال"}
                action={
                  !hasActiveFilters ? (
                    <button
                      onClick={() => setMaterialModal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      إضافة ماتريال
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMaterials.map((m) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    client={clients.find((c) => c.id === m.clientId)}
                    onEdit={(mat) => { setEditingMaterial(mat); setMaterialModal(true); }}
                    onDelete={(id) => setDeleteConfirm({ type: "material", id })}
                    onToggleFav={toggleFav}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TASKS ─── */}
        {tab === "tasks" && activeWorkspaceId && (
          <div className="max-w-2xl mx-auto">
            <DailyTasksPanel
              tasks={dailyTasks}
              clients={clients}
              materials={materials}
              activeWorkspaceId={activeWorkspaceId}
              onAdd={addDailyTask}
              onEdit={editDailyTask}
              onReorder={reorderTasks}
              onDelete={removeDailyTask}
              onAddMaterial={addMaterial}
              onAddStyleRef={addStyleRef}
            />
          </div>
        )}

        {/* ─── CALENDAR ─── */}
        {tab === "calendar" && (
          <div className="max-w-5xl mx-auto">
            <TaskCalendar
              tasks={dailyTasks}
              clients={clients}
              onAdd={addDailyTask}
              onEdit={editDailyTask}
            />
          </div>
        )}
      </main>

      {/* ─── MODALS ─── */}

      {/* Client Modal */}
      <Modal
        open={clientModal}
        onClose={() => { setClientModal(false); setEditingClient(null); }}
        title={editingClient ? "تعديل العميل" : "إضافة عميل"}
      >
        <ClientForm
          client={editingClient}
          onSubmit={async (data) => {
            if (editingClient) {
              await editClient(editingClient.id, data);
            } else {
              await addClient(data);
            }
            setClientModal(false);
            setEditingClient(null);
          }}
          onCancel={() => { setClientModal(false); setEditingClient(null); }}
        />
      </Modal>

      {/* Material Modal */}
      <Modal
        open={materialModal}
        onClose={() => { setMaterialModal(false); setEditingMaterial(null); }}
        title={editingMaterial ? "تعديل الماتريال" : "إضافة لينك ماتريال"}
        wide
      >
        <MaterialForm
          material={editingMaterial}
          clients={clients}
          defaultClientId={selectedClientId ?? undefined}
          workspaceId={activeWorkspaceId ?? ""}
          onSubmit={async (data) => {
            if (editingMaterial) {
              await editMaterial(editingMaterial.id, data);
            } else {
              await addMaterial(data);
            }
            setMaterialModal(false);
            setEditingMaterial(null);
          }}
          onCancel={() => { setMaterialModal(false); setEditingMaterial(null); }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="تأكيد الحذف"
      >
        <p className="text-sm text-zinc-600 mb-6">
          {deleteConfirm?.type === "client"
            ? "هل أنت متأكد من حذف هذا العميل؟ سيتم حذف كل الماتريال المرتبطة به."
            : "هل أنت متأكد من حذف هذا اللينك؟"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={confirmDelete}
            className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            نعم، احذف
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </Modal>
    </div>
  );
}
