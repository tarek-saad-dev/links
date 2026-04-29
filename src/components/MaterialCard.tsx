"use client";

import { useState } from "react";
import type { Client, MaterialLink } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Badge from "./Badge";
import {
  Star,
  ExternalLink,
  Pencil,
  Trash2,
  Library,
  FolderOpen,
  Calendar,
  Copy,
  Check,
} from "lucide-react";

interface MaterialCardProps {
  material: MaterialLink;
  client?: Client;
  onEdit: (m: MaterialLink) => void;
  onDelete: (id: string) => void;
  onToggleFav: (id: string) => void;
  pending?: Record<string, boolean>;
}

export default function MaterialCard({
  material,
  client,
  onEdit,
  onDelete,
  onToggleFav,
  pending,
}: MaterialCardProps) {
  const isLibrary = material.type === "library";
  const [copied, setCopied] = useState(false);

  async function copyLocalPath() {
    if (!material.localPath) return;
    await navigator.clipboard.writeText(material.localPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all hover:shadow-md ${isLibrary
        ? "border-amber-200 bg-gradient-to-l from-amber-50/50 to-white"
        : "border-zinc-200"
        }`}
    >
      {isLibrary && (
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isLibrary ? (
                <Badge variant="library">
                  <Library size={12} /> مكتبة
                </Badge>
              ) : (
                <Badge variant="project">
                  <FolderOpen size={12} /> مشروع
                </Badge>
              )}
              {material.isFavorite && (
                <Badge variant="favorite">⭐ مفضل</Badge>
              )}
              {client && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: client.color }}
                >
                  {client.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-zinc-900 text-sm leading-snug truncate">
                {material.title}
              </h3>
              <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded shrink-0">
                #{material.order}
              </span>
            </div>
            {material.description && (
              <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                {material.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {material.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
            {material.shootDate && (
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Calendar size={12} />
                {formatDate(material.shootDate)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onToggleFav(material.id)}
              disabled={pending?.toggleFav}
              className={`p-1.5 rounded-lg transition-colors ${material.isFavorite
                ? "text-amber-500 hover:bg-amber-50"
                : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50"
                } disabled:opacity-50`}
              title={material.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              {pending?.toggleFav ? (
                <span className="w-4 h-4 border-2 border-zinc-300 border-t-amber-500 rounded-full animate-spin inline-block" />
              ) : (
                <Star size={16} fill={material.isFavorite ? "currentColor" : "none"} />
              )}
            </button>
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="فتح الرابط"
            >
              <ExternalLink size={16} />
            </a>
            {material.localPath && (
              <button
                onClick={copyLocalPath}
                className={`p-1.5 rounded-lg transition-colors ${copied
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-zinc-400 hover:text-amber-600 hover:bg-amber-50"
                  }`}
                title={copied ? "تم النسخ!" : "نسخ مسار الجهاز"}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
            <button
              onClick={() => onEdit(material)}
              disabled={pending?.editMaterial}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="تعديل"
            >
              {pending?.editMaterial ? (
                <span className="w-4 h-4 border-2 border-zinc-300 border-t-blue-500 rounded-full animate-spin inline-block" />
              ) : (
                <Pencil size={16} />
              )}
            </button>
            <button
              onClick={() => onDelete(material.id)}
              disabled={pending?.removeMaterial}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="حذف"
            >
              {pending?.removeMaterial ? (
                <span className="w-4 h-4 border-2 border-zinc-300 border-t-rose-500 rounded-full animate-spin inline-block" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
