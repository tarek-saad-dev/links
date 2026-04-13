"use client";

import { useState, useEffect } from "react";
import type { Client } from "@/lib/types";
import { CLIENT_COLORS } from "@/lib/utils";

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: { name: string; notes: string; color: string }) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [name, setName] = useState(client?.name ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [color, setColor] = useState(client?.color ?? CLIENT_COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (client) {
      setName(client.name);
      setNotes(client.notes);
      setColor(client.color);
    }
  }, [client]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    setError("");
    onSubmit({ name: name.trim(), notes: notes.trim(), color });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          اسم العميل <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: الجداوي"
          className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          autoFocus
        />
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          ملاحظات
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات عن العميل..."
          rows={3}
          className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          لون العميل
        </label>
        <div className="flex flex-wrap gap-2">
          {CLIENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c
                  ? "ring-2 ring-offset-2 ring-indigo-400 scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {client ? "حفظ التعديلات" : "إضافة عميل"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
