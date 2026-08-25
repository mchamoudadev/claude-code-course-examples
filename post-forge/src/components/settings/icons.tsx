import type { IconProps } from "@/components/ui";

/**
 * Database glyph — the shared design-system icon set has no database mark, so
 * this local line-icon (same 24px viewBox + round caps as the set) fills the
 * MongoDB integration row. Kept in the settings subdir so it never touches the
 * shared barrel.
 */
export function DatabaseIcon({ size = 18, strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  );
}
