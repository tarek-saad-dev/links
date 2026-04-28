"use client";

import { useState, useMemo } from "react";
import type { DailyTask, Client } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
} from "lucide-react";

interface TaskCalendarProps {
  tasks: DailyTask[];
  clients: Client[];
  onAdd: (input: {
    title: string;
    clientId: string;
    date: string;
    materialId?: string | null;
    styleRefIds?: string[];
    notes?: string;
  }) => Promise<DailyTask>;
  onEdit: (
    id: string,
    updates: Partial<
      Pick<DailyTask, "title" | "status" | "notes" | "materialId" | "styleRefIds" | "clientId" | "order" | "date">
    >,
  ) => Promise<DailyTask | undefined>;
}

const WEEK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getMonthYearAr(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split("T")[0];
}

export default function TaskCalendar({
  tasks,
  clients,
  onAdd,
  onEdit,
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickClientId, setQuickClientId] = useState("");

  const year = new Date(currentDate + "T00:00:00").getFullYear();
  const month = new Date(currentDate + "T00:00:00").getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, DailyTask[]> = {};
    tasks.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return map;
  }, [tasks]);

  function getClientColor(clientId: string) {
    return clients.find((c) => c.id === clientId)?.color ?? "#6366f1";
  }

  async function handleDrop(date: string) {
    if (!draggingTaskId || draggingTaskId === dragOverDate) {
      setDraggingTaskId(null);
      setDragOverDate(null);
      return;
    }

    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.date === date) {
      setDraggingTaskId(null);
      setDragOverDate(null);
      return;
    }

    // Move task to new date
    await onEdit(task.id, { date });
    setDraggingTaskId(null);
    setDragOverDate(null);
  }

  async function handleQuickAddSubmit(date: string) {
    if (!quickTitle.trim() || !quickClientId) return;

    await onAdd({
      title: quickTitle,
      clientId: quickClientId,
      date,
    });

    setQuickTitle("");
    setQuickClientId("");
    setShowQuickAdd(null);
  }

  // Generate calendar days
  const calendarDays: { date: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month filler days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    calendarDays.push({
      date: d.toISOString().split("T")[0],
      dayNum: prevMonthDays - i + 1,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({
      date: d.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Next month filler days to complete the grid (6 rows = 42 cells)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({
      date: d.toISOString().split("T")[0],
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3">
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, -1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800">{getMonthYearAr(currentDate)}</p>
        </div>
        <button
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-zinc-200">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-zinc-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map(({ date, dayNum, isCurrentMonth }) => {
            const dayTasks = tasksByDate[date] ?? [];
            const isToday = date === today;
            const isDragOver = dragOverDate === date && draggingTaskId;
            const showAddForm = showQuickAdd === date;

            return (
              <div
                key={date}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverDate(date);
                }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={() => handleDrop(date)}
                onClick={() => {
                  if (!showAddForm) setShowQuickAdd(date);
                }}
                className={`min-h-[120px] border-b border-r border-zinc-100 p-2 transition-colors cursor-pointer ${isCurrentMonth ? "bg-white" : "bg-zinc-50/50"
                  } ${isToday ? "bg-indigo-50/30" : ""} ${isDragOver ? "bg-indigo-100 border-indigo-300" : "hover:bg-zinc-50"
                  }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium ${isToday
                      ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : isCurrentMonth
                        ? "text-zinc-700"
                        : "text-zinc-300"
                      }`}
                  >
                    {dayNum}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-zinc-400">{dayTasks.length} تاسك</span>
                  )}
                </div>

                {/* Tasks list */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 4).map((task) => {
                    const color = getClientColor(task.clientId);
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverDate(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could add edit modal here
                        }}
                        className={`group flex items-center gap-1 px-1.5 py-1 rounded text-[10px] cursor-grab active:cursor-grabbing ${task.status === "done"
                          ? "bg-zinc-100 text-zinc-400 line-through"
                          : "bg-white border border-zinc-200 shadow-sm hover:shadow-md"
                          }`}
                      >
                        <GripVertical size={10} className="text-zinc-300 shrink-0" />
                        <span className="truncate flex-1">{task.title}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    );
                  })}
                  {dayTasks.length > 4 && (
                    <p className="text-[10px] text-zinc-400 text-center">
                      +{dayTasks.length - 4} أكثر
                    </p>
                  )}
                </div>

                {/* Quick add form */}
                {showAddForm && (
                  <div
                    className="mt-1 space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      placeholder="تاسك جديد..."
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      autoFocus
                      className="w-full text-[10px] border border-zinc-200 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-400"
                    />
                    <select
                      value={quickClientId}
                      onChange={(e) => setQuickClientId(e.target.value)}
                      className="w-full text-[10px] border border-zinc-200 rounded px-1 py-0.5 bg-white"
                    >
                      <option value="">اختر عميل...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickAddSubmit(date)}
                        disabled={!quickTitle.trim() || !quickClientId}
                        className="flex-1 bg-indigo-600 text-white rounded text-[10px] py-1 disabled:opacity-50"
                      >
                        إضافة
                      </button>
                      <button
                        onClick={() => {
                          setShowQuickAdd(null);
                          setQuickTitle("");
                          setQuickClientId("");
                        }}
                        className="px-2 text-zinc-400 hover:text-zinc-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty slot indicator */}
                {!showAddForm && dayTasks.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Plus size={14} className="text-zinc-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-center gap-4 text-xs text-zinc-400 px-2">
        <span className="flex items-center gap-1">
          <GripVertical size={12} />
          اسحب التاسك لنقله ليوم تاني
        </span>
        <span className="flex items-center gap-1">
          <Plus size={12} />
          اضغط على أي يوم لإضافة تاسك
        </span>
      </div>
    </div>
  );
}
