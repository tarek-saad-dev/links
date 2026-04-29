"use client";

import { useState } from "react";
import type { Workspace } from "@/lib/types";
import { Briefcase, Plus, Settings, CheckCircle2 } from "lucide-react";
import Modal from "./Modal";

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onAdd: (input: { name: string; color: string; description?: string }) => void;
  onEdit: (id: string, updates: Partial<Pick<Workspace, "name" | "color" | "isActive">>) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

export default function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: WorkspaceSelectorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [form, setForm] = useState({ name: "", color: PRESET_COLORS[0], description: "" });

  const active = workspaces.find((w) => w.id === activeWorkspaceId);

  function handleAddSubmit() {
    if (!form.name.trim()) return;
    onAdd({ name: form.name.trim(), color: form.color, description: form.description });
    setForm({ name: "", color: PRESET_COLORS[0], description: "" });
    setShowAdd(false);
  }

  function handleEditSubmit() {
    if (!editing || !form.name.trim()) return;
    onEdit(editing.id, { name: form.name.trim(), color: form.color });
    setEditing(null);
    setForm({ name: "", color: PRESET_COLORS[0], description: "" });
  }

  return (
    <>
      {/* Selector Button */}
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-xl hover:border-indigo-300 transition-colors">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: active?.color || "#6366f1" }}
          />
          <span className="text-sm font-medium text-zinc-700 max-w-[120px] truncate">
            {active?.name || "اختر مساحة عمل"}
          </span>
          <Briefcase size={14} className="text-zinc-400" />
        </button>

        {/* Dropdown */}
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl border border-zinc-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div className="p-2">
            <p className="text-xs font-medium text-zinc-400 px-2 py-1">مساحات العمل</p>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelect(w.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                  w.id === activeWorkspaceId
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-zinc-50 text-zinc-700"
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }} />
                <span className="flex-1 text-right truncate">{w.name}</span>
                {w.id === activeWorkspaceId && <CheckCircle2 size={14} />}
              </button>
            ))}

            <div className="border-t border-zinc-100 mt-2 pt-2">
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                <Plus size={14} />
                <span>إضافة مساحة جديدة</span>
              </button>
              {workspaces.length > 1 && (
                <button
                  onClick={() => active && setEditing(active)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  <Settings size={14} />
                  <span>إدارة المساحات</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="مساحة عمل جديدة">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">الاسم</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: BlackIce, Freelance, Creative Marketing..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">اللون</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-lg transition-transform ${
                    form.color === c ? "ring-2 ring-offset-2 ring-zinc-400 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">وصف (اختياري)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="وصف مختصر للمساحة..."
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddSubmit}
              disabled={!form.name.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              إضافة
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="تعديل مساحة العمل">
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">الاسم</label>
              <input
                type="text"
                value={form.name || editing.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">اللون</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      (form.color || editing.color) === c
                        ? "ring-2 ring-offset-2 ring-zinc-400 scale-110"
                        : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                حفظ
              </button>
              {workspaces.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذه المساحة؟")) {
                      onDelete(editing.id);
                      setEditing(null);
                    }
                  }}
                  className="px-4 py-2 bg-rose-100 text-rose-600 rounded-lg text-sm"
                >
                  حذف
                </button>
              )}
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
