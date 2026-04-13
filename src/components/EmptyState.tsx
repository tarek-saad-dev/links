import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-2xl bg-zinc-50 text-zinc-300 mb-4">
        {icon || <FolderOpen size={40} />}
      </div>
      <h3 className="text-lg font-semibold text-zinc-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
