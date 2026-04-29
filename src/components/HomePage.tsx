"use client";

import { useAppData } from "@/lib/useAppData";
import { useState } from "react";
import { CheckCircle2, Circle, Clock, Plus, Link2, Palette, ArrowRight, Wallet, UserCircle, Lightbulb } from "lucide-react";
import type { DailyTask, Workspace, Client, MaterialLink, StyleRef } from "@/lib/types";
import Link from "next/link";

const TODAY = new Date().toISOString().split("T")[0];

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface WorkspaceColumnProps {
  workspace: Workspace;
  tasks: DailyTask[];
  allClients: Client[];
  allMaterials: MaterialLink[];
  onToggleStatus: (task: DailyTask) => Promise<void>;
}

function WorkspaceColumn({
  workspace,
  tasks,
  allClients,
  allMaterials,
  onToggleStatus,
}: WorkspaceColumnProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function getClientColor(clientId: string) {
    return allClients.find((c) => c.id === clientId)?.color ?? "#6366f1";
  }

  function getClientName(clientId: string) {
    return allClients.find((c) => c.id === clientId)?.name ?? "";
  }

  function getMaterial(materialId: string | null): MaterialLink | null {
    if (!materialId) return null;
    return allMaterials.find((m) => m.id === materialId) ?? null;
  }

  function getStyleRefNote(clientId: string, refId: string | null): StyleRef | null {
    if (!refId) return null;
    const client = allClients.find((c) => c.id === clientId);
    return client?.styleRefs.find((r) => r.id === refId) ?? null;
  }

  async function handleToggle(task: DailyTask) {
    setTogglingId(task.id);
    try {
      await onToggleStatus(task);
    } finally {
      setTogglingId(null);
    }
  }

  const STATUS_ICON = {
    todo: <Circle size={18} className="text-zinc-400" />,
    pending: <Clock size={18} className="text-amber-500" />,
    done: <CheckCircle2 size={18} className="text-emerald-500" />,
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden min-w-[300px] flex flex-col">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-zinc-200"
        style={{ backgroundColor: workspace.color + "10" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: workspace.color }}
            />
            <h3 className="font-semibold text-zinc-900">{workspace.name}</h3>
            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
              #{workspace.order}
            </span>
          </div>
          <span className="text-xs text-zinc-500 bg-white px-2 py-1 rounded-full border border-zinc-200">
            {tasks.length} تاسك
          </span>
        </div>
        {/* Type Badge */}
        <span className={`inline-flex items-center gap-1 text-xs ${workspace.type === "salary"
          ? "text-emerald-700"
          : workspace.type === "freelance"
            ? "text-blue-700"
            : "text-amber-700"
          }`}>
          {workspace.type === "salary" && <Wallet size={12} />}
          {workspace.type === "freelance" && <UserCircle size={12} />}
          {workspace.type === "opportunity" && <Lightbulb size={12} />}
          {workspace.type === "salary" && "راتب شهري"}
          {workspace.type === "freelance" && "فريلانس"}
          {workspace.type === "opportunity" && "فرصة مستقبلية"}
        </span>
      </div>

      {/* Tasks */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[60vh]">
        {tasks.length === 0 && (
          <div className="text-center py-8 text-zinc-400 text-sm">
            لا يوجد تاسكات لهذا اليوم
          </div>
        )}

        {tasks.map((task) => {
          const color = getClientColor(task.clientId);
          const material = getMaterial(task.materialId);
          const refs = (task.styleRefIds ?? [])
            .map((id) => getStyleRefNote(task.clientId, id))
            .filter((r): r is StyleRef => r !== null);

          return (
            <div
              key={task.id}
              className={`p-3 rounded-lg border transition-all ${task.status === "done"
                ? "bg-zinc-50 border-zinc-200 opacity-60"
                : "bg-white border-zinc-200 hover:border-zinc-300"
                }`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => handleToggle(task)}
                  disabled={togglingId === task.id}
                  className="mt-0.5 flex-shrink-0"
                >
                  {STATUS_ICON[task.status]}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${task.status === "done" ? "line-through text-zinc-500" : "text-zinc-900"
                      }`}
                  >
                    {task.title}
                  </p>

                  {/* Client */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-zinc-600">
                      {getClientName(task.clientId)}
                    </span>
                  </div>

                  {/* Material */}
                  {material && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Link2 size={12} />
                      {material.title}
                    </a>
                  )}

                  {/* Style References */}
                  {refs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {refs.map((ref) => (
                        <a
                          key={ref.id}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                        >
                          <Palette size={10} />
                          {ref.platform}
                          {ref.note && <span className="text-purple-500">— {ref.note}</span>}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {task.notes && (
                    <p className="text-xs text-zinc-500 mt-1.5">{task.notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - Link to workspace */}
      <Link
        href={`/workspace/${workspace.id}`}
        className="px-4 py-2 border-t border-zinc-200 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-between"
      >
        <span>فتح الـWorkspace</span>
        <ArrowRight size={16} className="rotate-180" />
      </Link>
    </div>
  );
}

export default function HomePage() {
  const {
    ready,
    workspaces,
    allClients,
    allMaterials,
    allDailyTasks,
    editDailyTask,
  } = useAppData();

  const [date, setDate] = useState(TODAY);

  // Group tasks by workspace
  const tasksByWorkspace = workspaces.map((ws) => ({
    workspace: ws,
    tasks: allDailyTasks
      .filter((t) => t.workspaceId === ws.id && t.date === date)
      .sort((a, b) => a.order - b.order),
  }));

  async function toggleStatus(task: DailyTask) {
    const STATUS_CYCLE: Record<DailyTask["status"], DailyTask["status"]> = {
      todo: "pending",
      pending: "done",
      done: "todo",
    };
    await editDailyTask(task.id, { status: STATUS_CYCLE[task.status] });
  }

  function addDays(dateStr: string, n: number) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">تاسكات اليوم</h1>
              <p className="text-sm text-zinc-500">نظرة عامة على كل الـWorkspaces</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
                <button
                  onClick={() => setDate((d) => addDays(d, 1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors"
                >
                  <ArrowRight size={18} className="text-zinc-600 rotate-180" />
                </button>
                <span className="text-sm font-medium text-zinc-700 min-w-[140px] text-center">
                  {formatDateAr(date)}
                </span>
                <button
                  onClick={() => setDate((d) => addDays(d, -1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors"
                >
                  <ArrowRight size={18} className="text-zinc-600" />
                </button>
              </div>

              {/* Workspaces Link */}
              <Link
                href="/workspaces"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={18} />
                <span>إدارة الـWorkspaces</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Grid of Workspaces */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {workspaces.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 mb-4">لا يوجد workspaces</p>
            <Link
              href="/workspaces"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus size={18} />
              إنشاء Workspace جديد
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {tasksByWorkspace.map(({ workspace, tasks }) => (
              <WorkspaceColumn
                key={workspace.id}
                workspace={workspace}
                tasks={tasks}
                allClients={allClients}
                allMaterials={allMaterials}
                onToggleStatus={toggleStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
