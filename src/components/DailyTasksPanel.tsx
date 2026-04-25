"use client";

import { useState } from "react";
import type { DailyTask, Client, MaterialLink, MaterialType, SocialPlatform, StyleRef } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Link2,
  Palette,
  FileText,
  X,
  Pencil,
  Loader2,
} from "lucide-react";

interface DailyTasksPanelProps {
  tasks: DailyTask[];
  clients: Client[];
  materials: MaterialLink[];
  onAdd: (input: {
    title: string;
    clientId: string;
    date: string;
    materialId?: string | null;
    styleRefId?: string | null;
    notes?: string;
  }) => Promise<DailyTask>;
  onEdit: (
    id: string,
    updates: Partial<
      Pick<DailyTask, "title" | "status" | "notes" | "materialId" | "styleRefId" | "clientId" | "order">
    >,
  ) => Promise<DailyTask | undefined>;
  onReorder: (date: string, orderedIds: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddMaterial: (data: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">) => Promise<MaterialLink>;
  onAddStyleRef: (clientId: string, input: { platform: SocialPlatform; url: string; note?: string }) => Promise<StyleRef | undefined>;
}

const TODAY = new Date().toISOString().split("T")[0];

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const ADD_NEW_MATERIAL = "__add_new__";
const ADD_NEW_REF = "__add_new_ref__";

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

export default function DailyTasksPanel({
  tasks,
  clients,
  materials,
  onAdd,
  onEdit,
  onReorder,
  onDelete,
  onAddMaterial,
  onAddStyleRef,
}: DailyTasksPanelProps) {
  const [date, setDate] = useState(TODAY);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    clientId: "",
    materialId: "" as string,
    styleRefId: "" as string,
    notes: "",
  });

  // Loading states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [copiedMatId, setCopiedMatId] = useState<string | null>(null);

  async function handleMaterialClick(mat: MaterialLink) {
    if (mat.url) {
      window.open(mat.url, "_blank", "noopener,noreferrer");
    } else if (mat.localPath) {
      await navigator.clipboard.writeText(mat.localPath);
      setCopiedMatId(mat.id);
      setTimeout(() => setCopiedMatId(null), 2000);
    }
  }

  // Inline quick-add material
  const [quickMat, setQuickMat] = useState({ title: "", url: "", type: "project" as MaterialType });
  const [quickMatSaving, setQuickMatSaving] = useState(false);
  const showQuickMat = form.materialId === ADD_NEW_MATERIAL;

  // Inline quick-add style ref
  const [quickRef, setQuickRef] = useState({ platform: "instagram" as SocialPlatform, url: "", note: "" });
  const [quickRefSaving, setQuickRefSaving] = useState(false);
  const showQuickRef = form.styleRefId === ADD_NEW_REF;

  async function handleQuickAddStyleRef() {
    if (!quickRef.url.trim() || !form.clientId) return;
    setQuickRefSaving(true);
    try {
      const ref = await onAddStyleRef(form.clientId, {
        platform: quickRef.platform,
        url: quickRef.url.trim(),
        note: quickRef.note.trim(),
      });
      if (ref) {
        setForm((f) => ({ ...f, styleRefId: ref.id }));
        setQuickRef({ platform: "instagram", url: "", note: "" });
      }
    } finally {
      setQuickRefSaving(false);
    }
  }

  async function handleQuickAddMaterial() {
    if (!quickMat.title.trim() || !form.clientId) return;
    setQuickMatSaving(true);
    try {
      const mat = await onAddMaterial({
        title: quickMat.title.trim(),
        url: quickMat.url.trim(),
        localPath: "",
        clientId: form.clientId,
        shootDate: "",
        type: quickMat.type,
        tags: [],
        description: "",
        isFavorite: false,
      });
      setForm((f) => ({ ...f, materialId: mat.id }));
      setQuickMat({ title: "", url: "", type: "project" });
    } finally {
      setQuickMatSaving(false);
    }
  }

  const dayTasks = tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.order - b.order);

  const doneCount = dayTasks.filter((t) => t.status === "done").length;
  const pendingCount = dayTasks.filter((t) => t.status === "pending").length;

  const selectedClientMaterials = form.clientId
    ? materials.filter((m) => m.clientId === form.clientId)
    : [];

  const selectedClientStyleRefs = form.clientId
    ? (clients.find((c) => c.id === form.clientId)?.styleRefs ?? [])
    : [];

  function resetForm() {
    setForm({ title: "", clientId: "", materialId: "", styleRefId: "", notes: "" });
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.clientId) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await onEdit(editingId, {
          title: form.title,
          clientId: form.clientId,
          materialId: form.materialId || null,
          styleRefId: form.styleRefId || null,
          notes: form.notes,
        });
      } else {
        await onAdd({
          title: form.title,
          clientId: form.clientId,
          date,
          materialId: form.materialId || null,
          styleRefId: form.styleRefId || null,
          notes: form.notes,
        });
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(task: DailyTask) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      clientId: task.clientId,
      materialId: task.materialId ?? "",
      styleRefId: task.styleRefId ?? "",
      notes: task.notes,
    });
    setShowForm(true);
  }

  const STATUS_CYCLE: Record<DailyTask["status"], DailyTask["status"]> = {
    todo: "pending",
    pending: "done",
    done: "todo",
  };

  async function toggleStatus(task: DailyTask) {
    setTogglingId(task.id);
    try {
      await onEdit(task.id, { status: STATUS_CYCLE[task.status] });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  // Drag-and-drop reorder
  function onDragStart(id: string) {
    setDraggingId(id);
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  async function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const ids = dayTasks.map((t) => t.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggingId);
    setDraggingId(null);
    setDragOverId(null);
    setReordering(true);
    try {
      await onReorder(date, ids);
    } finally {
      setReordering(false);
    }
  }

  function getClientColor(clientId: string) {
    return clients.find((c) => c.id === clientId)?.color ?? "#6366f1";
  }

  function getClientName(clientId: string) {
    return clients.find((c) => c.id === clientId)?.name ?? "";
  }

  function getMaterial(materialId: string | null): MaterialLink | null {
    if (!materialId) return null;
    return materials.find((m) => m.id === materialId) ?? null;
  }

  function getStyleRefNote(clientId: string, refId: string | null): StyleRef | null {
    if (!refId) return null;
    return clients.find((c) => c.id === clientId)?.styleRefs.find((r) => r.id === refId) ?? null;
  }

  const platformColors: Record<string, string> = {
    facebook: "#1877F2",
    instagram: "#E1306C",
    tiktok: "#010101",
    youtube: "#FF0000",
    other: "#6B7280",
  };

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800">{formatDateAr(date)}</p>
          {date === TODAY && (
            <span className="text-xs text-indigo-500 font-medium">اليوم</span>
          )}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Progress bar */}
      {dayTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-zinc-400">
                <Circle size={10} />
                {dayTasks.length - doneCount - pendingCount} لسه متبديش
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Clock size={10} />
                {pendingCount} مستني موافقة
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={10} />
                {doneCount} تمت
              </span>
            </div>
            <span className="text-xs font-medium text-zinc-500">{dayTasks.length} تاسك</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(doneCount / dayTasks.length) * 100}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${(pendingCount / dayTasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      <div className={`space-y-2 transition-opacity duration-200 ${reordering ? "opacity-60 pointer-events-none" : ""}`}>
        {dayTasks.length === 0 && !showForm && (
          <div className="text-center py-10 text-zinc-400 text-sm">
            لا يوجد تاسكات لهذا اليوم
          </div>
        )}

        {dayTasks.map((task) => {
          const color = getClientColor(task.clientId);
          const material = getMaterial(task.materialId);
          const ref = getStyleRefNote(task.clientId, task.styleRefId);
          const isDragOver = dragOverId === task.id;

          return (
            <div
              key={task.id}
              draggable
              onDragStart={() => onDragStart(task.id)}
              onDragOver={(e) => onDragOver(e, task.id)}
              onDrop={() => onDrop(task.id)}
              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              className={`group bg-white rounded-xl border transition-all duration-150 ${isDragOver
                ? "border-indigo-400 shadow-md scale-[1.01]"
                : task.status === "done"
                  ? "border-zinc-100 opacity-50"
                  : task.status === "pending"
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                } ${draggingId === task.id ? "opacity-40" : ""}`}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                {/* drag handle */}
                <div className="mt-0.5 cursor-grab text-zinc-300 group-hover:text-zinc-400">
                  <GripVertical size={16} />
                </div>

                {/* status toggle */}
                <button
                  onClick={() => toggleStatus(task)}
                  disabled={togglingId === task.id}
                  title={
                    task.status === "done" ? "تم — اضغط للتراجع"
                      : task.status === "pending" ? "مستني موافقة العميل — اضغط لتأكيد القبول"
                        : "لسه متبديش — اضغط للإرسال"
                  }
                  className="mt-0.5 flex-shrink-0 transition-colors disabled:cursor-not-allowed"
                >
                  {togglingId === task.id ? (
                    <Loader2 size={20} className="text-zinc-300 animate-spin" />
                  ) : task.status === "done" ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : task.status === "pending" ? (
                    <Clock size={20} className="text-amber-400 hover:text-amber-500" />
                  ) : (
                    <Circle size={20} className="text-zinc-300 hover:text-indigo-400" />
                  )}
                </button>

                {/* content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-snug ${task.status === "done"
                      ? "line-through text-zinc-400"
                      : task.status === "pending"
                        ? "text-amber-800"
                        : "text-zinc-800"
                      }`}
                  >
                    {task.title}
                  </p>

                  {/* client badge */}
                  <span
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    {getClientName(task.clientId)}
                  </span>

                  {/* links */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {material && (() => {
                      const hasLink = !!(material.url || material.localPath);
                      const isCopied = copiedMatId === material.id;
                      const isLocalOnly = !material.url && !!material.localPath;
                      return hasLink ? (
                        <button
                          onClick={() => handleMaterialClick(material)}
                          title={isLocalOnly ? (isCopied ? "تم نسخ المسار" : "نسخ مسار الجهاز") : "فتح في تاب جديد"}
                          className={`flex items-center gap-1 text-xs rounded-lg px-2 py-1 border transition-colors ${isCopied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600"
                            }`}
                        >
                          <Link2 size={11} />
                          {material.title}
                          {isCopied && <span className="text-emerald-500">✓</span>}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1">
                          <Link2 size={11} />
                          {material.title}
                        </span>
                      );
                    })()}
                    {ref && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg text-white"
                        style={{ backgroundColor: platformColors[ref.platform] ?? "#6B7280" }}
                      >
                        <Palette size={11} />
                        {ref.note || ref.platform}
                      </a>
                    )}
                    {task.notes && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <FileText size={11} />
                        {task.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(task)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={deletingId === task.id}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:cursor-not-allowed"
                  >
                    {deletingId === task.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-700">
              {editingId ? "تعديل تاسك" : "تاسك جديد"}
            </p>
            <button onClick={resetForm} className="text-zinc-400 hover:text-zinc-600">
              <X size={16} />
            </button>
          </div>

          {/* title */}
          <input
            autoFocus
            type="text"
            placeholder="اسم التاسك..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          {/* client */}
          <select
            value={form.clientId}
            onChange={(e) =>
              setForm({ ...form, clientId: e.target.value, materialId: "", styleRefId: "" })
            }
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">اختر المشروع...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* material (optional) */}
          {form.clientId && (
            <div className="space-y-2">
              <select
                value={form.materialId}
                onChange={(e) => {
                  setForm({ ...form, materialId: e.target.value });
                  if (e.target.value !== ADD_NEW_MATERIAL) {
                    setQuickMat({ title: "", url: "", type: "project" });
                  }
                }}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">ماتريال (اختياري)...</option>
                {selectedClientMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
                <option value={ADD_NEW_MATERIAL}>➕ إضافة ماتريال جديد...</option>
              </select>

              {/* inline quick-add */}
              {showQuickMat && (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-indigo-700">ماتريال جديد</p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="اسم الماتريال..."
                    value={quickMat.title}
                    onChange={(e) => setQuickMat({ ...quickMat, title: e.target.value })}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="الرابط أو المسار (اختياري)..."
                    value={quickMat.url}
                    onChange={(e) => setQuickMat({ ...quickMat, url: e.target.value })}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    dir="ltr"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickMat({ ...quickMat, type: "project" })}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${quickMat.type === "project"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-white border-zinc-200 text-zinc-500"
                        }`}
                    >
                      📁 مشروع
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickMat({ ...quickMat, type: "library" })}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors ${quickMat.type === "library"
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-white border-zinc-200 text-zinc-500"
                        }`}
                    >
                      📚 مكتبة
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleQuickAddMaterial}
                      disabled={!quickMat.title.trim() || quickMatSaving}
                      className="flex-1 text-xs font-medium bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {quickMatSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {quickMatSaving ? "جاري الحفظ..." : "إضافة"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, materialId: "" }));
                        setQuickMat({ title: "", url: "", type: "project" });
                      }}
                      className="px-3 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* style ref (optional) */}
          {form.clientId && (
            <div className="space-y-2">
              <select
                value={form.styleRefId}
                onChange={(e) => {
                  setForm({ ...form, styleRefId: e.target.value });
                  if (e.target.value !== ADD_NEW_REF) {
                    setQuickRef({ platform: "instagram", url: "", note: "" });
                  }
                }}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">ريفرنس ستايل (اختياري)...</option>
                {selectedClientStyleRefs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.platform} {r.note ? `— ${r.note}` : ""}
                  </option>
                ))}
                <option value={ADD_NEW_REF}>➕ إضافة ريفرنس جديد...</option>
              </select>

              {showQuickRef && (
                <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-purple-700">ريفرنس جديد — سيُضاف تلقائياً للعميل</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setQuickRef({ ...quickRef, platform: p.value })}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${quickRef.platform === p.value
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-white border-zinc-200 text-zinc-500 hover:border-purple-300"
                          }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    autoFocus
                    type="text"
                    placeholder="الرابط..."
                    value={quickRef.url}
                    onChange={(e) => setQuickRef({ ...quickRef, url: e.target.value })}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                    dir="ltr"
                  />
                  <input
                    type="text"
                    placeholder="وصف / ملاحظة (اختياري)..."
                    value={quickRef.note}
                    onChange={(e) => setQuickRef({ ...quickRef, note: e.target.value })}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleQuickAddStyleRef}
                      disabled={!quickRef.url.trim() || quickRefSaving}
                      className="flex-1 text-xs font-medium bg-purple-600 text-white rounded-lg py-1.5 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {quickRefSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {quickRefSaving ? "جاري الحفظ..." : "إضافة"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, styleRefId: "" }));
                        setQuickRef({ platform: "instagram", url: "", note: "" });
                      }}
                      className="px-3 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* notes */}
          <input
            type="text"
            placeholder="ملاحظات (اختياري)..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.clientId || submitting}
              className="flex-1 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  {editingId ? "جاري الحفظ..." : "جاري الإضافة..."}
                </span>
              ) : editingId ? "حفظ التعديل" : "إضافة"}
            </button>
            <button
              onClick={resetForm}
              disabled={submitting}
              className="px-4 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors text-sm"
        >
          <Plus size={16} />
          إضافة تاسك
        </button>
      )}
    </div>
  );
}
