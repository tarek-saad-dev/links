"use client";

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
} from "lucide-react";

interface MaterialCardProps {
  material: MaterialLink;
  client?: Client;
  onEdit: (m: MaterialLink) => void;
  onDelete: (id: string) => void;
  onToggleFav: (id: string) => void;
}

export default function MaterialCard({
  material,
  client,
  onEdit,
  onDelete,
  onToggleFav,
}: MaterialCardProps) {
  const isLibrary = material.type === "library";

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all hover:shadow-md ${
        isLibrary
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
            <h3 className="font-semibold text-zinc-900 text-sm leading-snug mb-1 truncate">
              {material.title}
            </h3>
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
              className={`p-1.5 rounded-lg transition-colors ${
                material.isFavorite
                  ? "text-amber-500 hover:bg-amber-50"
                  : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title={material.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              <Star size={16} fill={material.isFavorite ? "currentColor" : "none"} />
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
            <button
              onClick={() => onEdit(material)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
              title="تعديل"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => onDelete(material.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
              title="حذف"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
