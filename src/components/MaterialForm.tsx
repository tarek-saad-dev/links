"use client";

import { useState, useEffect } from "react";
import type { Client, MaterialLink, MaterialType } from "@/lib/types";
import TagInput from "./TagInput";

interface MaterialFormProps {
  material?: MaterialLink | null;
  clients: Client[];
  defaultClientId?: string;
  workspaceId: string;
  onSubmit: (data: Omit<MaterialLink, "id" | "createdAt" | "updatedAt">) => void | Promise<void>;
  onCancel: () => void;
  pending?: boolean;
}

export default function MaterialForm({
  material,
  clients,
  defaultClientId,
  workspaceId,
  onSubmit,
  onCancel,
  pending,
}: MaterialFormProps) {
  const [title, setTitle] = useState(material?.title ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [clientId, setClientId] = useState(material?.clientId ?? defaultClientId ?? "");
  const [shootDate, setShootDate] = useState(material?.shootDate ?? "");
  const [type, setType] = useState<MaterialType>(material?.type ?? "project");
  const [tags, setTags] = useState<string[]>(material?.tags ?? []);
  const [description, setDescription] = useState(material?.description ?? "");
  const [isFavorite, setIsFavorite] = useState(material?.isFavorite ?? false);
  const [localPath, setLocalPath] = useState(material?.localPath ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (material) {
      setTitle(material.title);
      setUrl(material.url);
      setLocalPath(material.localPath ?? "");
      setClientId(material.clientId);
      setShootDate(material.shootDate);
      setType(material.type);
      setTags(material.tags);
      setDescription(material.description);
      setIsFavorite(material.isFavorite);
    }
  }, [material]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "عنوان الماتريال مطلوب";
    if (!url.trim()) errs.url = "الرابط مطلوب";
    if (!clientId) errs.clientId = "اختر العميل";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title,
      url,
      localPath,
      clientId,
      shootDate,
      type,
      tags,
      description,
      isFavorite,
      workspaceId,
    });
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            العنوان <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: ماتريال حملة رمضان"
            className={inputClass}
            autoFocus
          />
          {errors.title && (
            <p className="text-xs text-rose-500 mt-1">{errors.title}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            الرابط <span className="text-rose-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={inputClass}
            dir="ltr"
          />
          {errors.url && (
            <p className="text-xs text-rose-500 mt-1">{errors.url}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            مسار على الجهاز
            <span className="mr-1.5 text-xs text-zinc-400 font-normal">(اختياري — لو الماتريال محمّل محلياً)</span>
          </label>
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="مثال: D:\Projects\Client\Shoot2025"
            className={inputClass}
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            العميل <span className="text-rose-500">*</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">اختر العميل...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.clientId && (
            <p className="text-xs text-rose-500 mt-1">{errors.clientId}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            تاريخ التصوير
          </label>
          <input
            type="date"
            value={shootDate}
            onChange={(e) => setShootDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            النوع
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("project")}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${type === "project"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                }`}
            >
              📁 مشروع
            </button>
            <button
              type="button"
              onClick={() => setType("library")}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${type === "library"
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                }`}
            >
              📚 مكتبة
            </button>
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
            />
            <span className="text-sm text-zinc-700">⭐ إضافة للمفضلة</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            هاشتاجات
          </label>
          <TagInput tags={tags} onChange={setTags} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            ملاحظات
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف أو ملاحظات..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {pending && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {material ? "حفظ التعديلات" : "إضافة ماتريال"}
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
