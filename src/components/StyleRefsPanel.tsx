"use client";

import { useState } from "react";
import type { StyleRef, SocialPlatform } from "@/lib/types";
import { Plus, Trash2, Pencil, ExternalLink, X, Check } from "lucide-react";

interface StyleRefsPanelProps {
  clientId: string;
  refs: StyleRef[];
  onAdd: (input: { platform: SocialPlatform; url: string; note?: string }) => Promise<void>;
  onEdit: (refId: string, updates: { platform?: SocialPlatform; url?: string; note?: string }) => Promise<void>;
  onDelete: (refId: string) => Promise<void>;
}

const PLATFORMS: { value: SocialPlatform; label: string; color: string; bg: string; icon: string }[] = [
  { value: "facebook", label: "Facebook", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: "f" },
  { value: "instagram", label: "Instagram", color: "text-pink-600", bg: "bg-pink-50 border-pink-200", icon: "ig" },
  { value: "tiktok", label: "TikTok", color: "text-zinc-800", bg: "bg-zinc-100 border-zinc-300", icon: "tt" },
  { value: "youtube", label: "YouTube", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "yt" },
  { value: "other", label: "أخرى", color: "text-violet-600", bg: "bg-violet-50 border-violet-200", icon: "•" },
];

function getPlatform(p: SocialPlatform) {
  return PLATFORMS.find((x) => x.value === p) ?? PLATFORMS[4];
}

const EMPTY_FORM = { platform: "instagram" as SocialPlatform, url: "", note: "" };

export default function StyleRefsPanel({ refs, onAdd, onEdit, onDelete }: Omit<StyleRefsPanelProps, "clientId"> & { clientId?: string }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateUrl(url: string) {
    return url.trim().startsWith("http://") || url.trim().startsWith("https://");
  }

  async function handleAdd() {
    if (!validateUrl(form.url)) { setUrlError("اكتب URL صحيح يبدأ بـ https://"); return; }
    setUrlError("");
    setLoading(true);
    await onAdd({ platform: form.platform, url: form.url.trim(), note: form.note });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setLoading(false);
  }

  function startEdit(ref: StyleRef) {
    setEditingId(ref.id);
    setEditForm({ platform: ref.platform, url: ref.url, note: ref.note });
  }

  async function handleEditSave() {
    if (!editingId) return;
    if (!validateUrl(editForm.url)) { setUrlError("اكتب URL صحيح يبدأ بـ https://"); return; }
    setUrlError("");
    setLoading(true);
    await onEdit(editingId, { platform: editForm.platform, url: editForm.url.trim(), note: editForm.note });
    setEditingId(null);
    setLoading(false);
  }

  const safeRefs = refs ?? [];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400" />
          رفرنسيز الستايل
          {safeRefs.length > 0 && (
            <span className="text-zinc-400 font-normal normal-case">({safeRefs.length})</span>
          )}
        </h4>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
          >
            <Plus size={12} />
            إضافة رفرنس
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mb-3 p-3 bg-white border border-zinc-200 rounded-xl space-y-2.5 shadow-sm">
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, platform: p.value }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.platform === p.value
                  ? `${p.bg} ${p.color} ring-1 ring-offset-1 ring-current`
                  : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="url"
            value={form.url}
            onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setUrlError(""); }}
            placeholder="https://www.instagram.com/p/..."
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            dir="ltr"
          />
          {urlError && <p className="text-xs text-rose-500">{urlError}</p>}
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="ملاحظة (اختياري) — مثال: ستايل كاجوال خفيف"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={loading || !form.url.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setUrlError(""); }}
              className="px-3 py-2 bg-zinc-100 text-zinc-500 rounded-lg text-xs font-medium hover:bg-zinc-200 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Refs List */}
      {safeRefs.length === 0 && !showForm ? (
        <p className="text-xs text-zinc-400 text-center py-3">
          لا يوجد رفرنسيز ستايل — اضغط &quot;إضافة رفرنس&quot; لتبدأ
        </p>
      ) : (
        <div className="space-y-2">
          {safeRefs.map((ref) => {
            const p = getPlatform(ref.platform);
            const isEditing = editingId === ref.id;

            return (
              <div key={ref.id} className={`rounded-xl border p-3 ${isEditing ? "bg-white border-indigo-200 shadow-sm" : `${p.bg}`}`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {PLATFORMS.map((pl) => (
                        <button
                          key={pl.value}
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, platform: pl.value }))}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${editForm.platform === pl.value
                            ? `${pl.bg} ${pl.color} ring-1 ring-offset-1 ring-current`
                            : "bg-zinc-50 border-zinc-200 text-zinc-400 hover:bg-zinc-100"
                            }`}
                        >
                          {pl.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={editForm.url}
                      onChange={(e) => { setEditForm((f) => ({ ...f, url: e.target.value })); setUrlError(""); }}
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                      dir="ltr"
                    />
                    {urlError && <p className="text-xs text-rose-500">{urlError}</p>}
                    <input
                      type="text"
                      value={editForm.note}
                      onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="ملاحظة..."
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:border-indigo-400 outline-none"
                    />
                    <div className="flex gap-1.5 pt-0.5">
                      <button
                        onClick={handleEditSave}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Check size={12} />
                        حفظ
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setUrlError(""); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-500 rounded-lg text-xs font-medium hover:bg-zinc-200"
                      >
                        <X size={12} />
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${p.bg} ${p.color}`}>
                      {p.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
                        {ref.note && (
                          <span className="text-xs text-zinc-400 truncate">— {ref.note}</span>
                        )}
                      </div>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-indigo-600 truncate block max-w-xs transition-colors"
                        dir="ltr"
                      >
                        {ref.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-white transition-colors"
                        title="فتح الرفرنس"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => startEdit(ref)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-white transition-colors"
                        title="تعديل"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(ref.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-white transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
