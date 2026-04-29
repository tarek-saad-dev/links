"use client";

import { useAppData } from "@/lib/useAppData";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Edit2, Palette, CheckCircle2, ArrowRight, Wallet, UserCircle, Lightbulb, ArrowUp, ArrowDown } from "lucide-react";
import type { WorkspaceType } from "@/lib/types";
import Link from "next/link";
import Modal from "@/components/Modal";

const PRESET_COLORS = [
  "#4f46e5", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#6366f1", // Indigo lighter
  "#14b8a6", // Teal
  "#f97316", // Orange
];

export default function WorkspacesPage() {
  const {
    ready,
    workspaces,
    addWorkspace,
    editWorkspace,
    removeWorkspace,
    reorderWorkspaces,
    stats,
  } = useAppData();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [type, setType] = useState<WorkspaceType>("freelance");
  const [description, setDescription] = useState("");

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  function startEdit(workspace: typeof workspaces[0]) {
    setEditingId(workspace.id);
    setName(workspace.name);
    setColor(workspace.color);
    setType(workspace.type);
    setDescription(workspace.description || "");
    setShowModal(true);
  }

  function startCreate() {
    setEditingId(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setType("freelance");
    setDescription("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await editWorkspace(editingId, { name: name.trim(), color, type });
    } else {
      await addWorkspace({ name: name.trim(), color, type, description: description.trim() });
    }
    setShowModal(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
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
              <h1 className="text-xl font-bold text-zinc-900">إدارة الـWorkspaces</h1>
            </div>
            <button
              onClick={startCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus size={18} />
              <span>إضافة Workspace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {workspaces.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-4">لا يوجد workspaces</p>
            <button
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus size={18} />
              إنشاء Workspace جديد
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((workspace, index) => (
              <div
                key={workspace.id}
                className="group bg-white rounded-xl border border-zinc-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Order Badge */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                        #{workspace.order}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            if (index === 0) return;
                            const newOrder = [...workspaces.map(w => w.id)];
                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                            reorderWorkspaces(newOrder);
                          }}
                          disabled={index === 0}
                          className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (index === workspaces.length - 1) return;
                            const newOrder = [...workspaces.map(w => w.id)];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            reorderWorkspaces(newOrder);
                          }}
                          disabled={index === workspaces.length - 1}
                          className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: workspace.color + "20" }}
                    >
                      <Palette size={24} style={{ color: workspace.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                        {workspace.name}
                      </h3>
                      {/* Type Badge */}
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs ${workspace.type === "salary"
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
                      {workspace.description && (
                        <p className="text-sm text-zinc-500 mt-0.5">{workspace.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={`/workspace/${workspace.id}`}
                      className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                    >
                      <ArrowRight size={16} className="rotate-180" />
                    </Link>
                    <button
                      onClick={() => startEdit(workspace)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا الـWorkspace؟ سيتم حذف جميع البيانات المرتبطة به!")) {
                          removeWorkspace(workspace.id);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-100">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {stats.totalClients}
                    </p>
                    <p className="text-xs text-zinc-500">عميل</p>
                  </div>
                  <div className="text-center border-x border-zinc-100">
                    <p className="text-lg font-semibold text-zinc-900">
                      {stats.totalMaterials}
                    </p>
                    <p className="text-xs text-zinc-500">ماتريال</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {stats.pendingTasks}
                    </p>
                    <p className="text-xs text-zinc-500">تاسك معلق</p>
                  </div>
                </div>

                {/* Open Link */}
                <Link
                  href={`/workspace/${workspace.id}`}
                  className="flex items-center gap-1 mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <span>فتح الـWorkspace</span>
                  <ArrowRight size={16} className="rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "تعديل Workspace" : "إضافة Workspace جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              الاسم <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: BlackIce"
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              اللون
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${color === c ? "ring-2 ring-offset-2 ring-zinc-400" : ""}`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <CheckCircle2 size={16} className="mx-auto text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              نوع الدخل
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "salary" as WorkspaceType, label: "راتب شهري", icon: Wallet, color: "emerald" },
                { key: "freelance" as WorkspaceType, label: "فريلانس", icon: UserCircle, color: "blue" },
                { key: "opportunity" as WorkspaceType, label: "فرصة", icon: Lightbulb, color: "amber" },
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${type === key
                    ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                    : "border-zinc-200 hover:border-zinc-300 text-zinc-600"
                    }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              وصف (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للـWorkspace..."
              rows={2}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? "حفظ التعديلات" : "إنشاء Workspace"}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
