import { cn } from "./cn";

export interface AvatarProps {
  /** Full name or initials — first two initials are shown. */
  name: string;
  size?: number;
  className?: string;
  /** CSS background (defaults to the brand emerald gradient). */
  background?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 34,
  className,
  background = "linear-gradient(135deg,#059669,#0ea5a0)",
}: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, background, fontSize: Math.round(size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
