"use client";

import { useState } from "react";
import type { DailyTask, Client, MaterialLink, StyleRef } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
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

export default function DailyTasksPanel({
  tasks,
  clients,
  materials,
  onAdd,
  onEdit,
  onReorder,
  onDelete,
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

  const dayTasks = tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.order - b.order);

  const doneCount = dayTasks.filter((t) => t.status === "done").length;

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

  async function toggleStatus(task: DailyTask) {
    await onEdit(task.id, { status: task.status === "done" ? "todo" : "done" });
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
    await onReorder(date, ids);
  }

  function getClientColor(clientId: string) {
    return clients.find((c) => c.id === clientId)?.color ?? "#6366f1";
  }

  function getClientName(clientId: string) {
    return clients.find((c) => c.id === clientId)?.name ?? "";
  }

  function getMaterialTitle(materialId: string | null) {
    if (!materialId) return null;
    return materials.find((m) => m.id === materialId)?.title ?? null;
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
            <span className="text-xs text-zinc-500">التقدم</span>
            <span className="text-xs font-medium text-zinc-700">
              {doneCount} / {dayTasks.length}
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(doneCount / dayTasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {dayTasks.length === 0 && !showForm && (
          <div className="text-center py-10 text-zinc-400 text-sm">
            لا يوجد تاسكات لهذا اليوم
          </div>
        )}

        {dayTasks.map((task) => {
          const color = getClientColor(task.clientId);
          const material = getMaterialTitle(task.materialId);
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
              className={`group bg-white rounded-xl border transition-all duration-150 ${
                isDragOver
                  ? "border-indigo-400 shadow-md scale-[1.01]"
                  : task.status === "done"
                  ? "border-zinc-100 opacity-60"
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
                  className="mt-0.5 flex-shrink-0 transition-colors"
                >
                  {task.status === "done" ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <Circle size={20} className="text-zinc-300 hover:text-indigo-400" />
                  )}
                </button>

                {/* content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-snug ${
                      task.status === "done" ? "line-through text-zinc-400" : "text-zinc-800"
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
                    {material && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1">
                        <Link2 size={11} />
                        {material}
                      </span>
                    )}
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
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
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
          {selectedClientMaterials.length > 0 && (
            <select
              value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">ماتريال (اختياري)...</option>
              {selectedClientMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          {/* style ref (optional) */}
          {selectedClientStyleRefs.length > 0 && (
            <select
              value={form.styleRefId}
              onChange={(e) => setForm({ ...form, styleRefId: e.target.value })}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">ريفرنس ستايل (اختياري)...</option>
              {selectedClientStyleRefs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.platform} {r.note ? `— ${r.note}` : ""}
                </option>
              ))}
            </select>
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
              disabled={!form.title.trim() || !form.clientId}
              className="flex-1 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {editingId ? "حفظ التعديل" : "إضافة"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
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
