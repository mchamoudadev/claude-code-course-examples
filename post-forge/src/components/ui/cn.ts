export type ClassValue = string | number | false | null | undefined;

/**
 * Tiny class combiner (clsx-lite). Joins truthy class fragments with a space.
 * Kept dependency-free — the design system ships no runtime deps.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
