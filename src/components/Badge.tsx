interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "library" | "project" | "favorite";
  className?: string;
}

const variants: Record<string, string> = {
  default: "bg-zinc-100 text-zinc-600",
  library: "bg-amber-50 text-amber-700 border border-amber-200",
  project: "bg-blue-50 text-blue-700 border border-blue-200",
  favorite: "bg-rose-50 text-rose-600 border border-rose-200",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
