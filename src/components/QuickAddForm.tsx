"use client";

import { useState } from "react";
import type { Client, MaterialType } from "@/lib/types";
import { Plus } from "lucide-react";

interface QuickAddFormProps {
  clients: Client[];
  onAdd: (data: {
    title: string;
    url: string;
    clientId: string;
    type: MaterialType;
    tags: string[];
    shootDate: string;
    description: string;
    isFavorite: boolean;
  }) => void;
}

export default function QuickAddForm({ clients, onAdd }: QuickAddFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<MaterialType>("project");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !clientId) {
      setError("العنوان والرابط والعميل مطلوبين");
      return;
    }
    setError("");
    onAdd({
      title,
      url,
      clientId,
      type,
      tags: [],
      shootDate: "",
      description: "",
      isFavorite: false,
    });
    setTitle("");
    setUrl("");
    setClientId("");
    setType("project");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-zinc-200 rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
          <Plus size={16} />
        </div>
        <h3 className="text-sm font-bold text-zinc-800">إضافة سريعة</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان الماتريال..."
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="الرابط..."
          dir="ltr"
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
        />
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
        >
          <option value="">العميل...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MaterialType)}
            className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          >
            <option value="project">مشروع</option>
            <option value="library">مكتبة</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            أضف
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-rose-500 mt-2">{error}</p>
      )}
    </form>
  );
}
