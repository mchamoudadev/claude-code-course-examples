import { cn } from "../ui/cn";
import { SparkLogo } from "../ui/icons";

export interface LogoProps {
  /** Show the "PostForge" wordmark alongside the mark. */
  wordmark?: boolean;
  size?: number;
  className?: string;
}

/** PostForge brand lockup — emerald gradient tile + optional wordmark. */
export function Logo({ wordmark = true, size = 30, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="flex items-center justify-center rounded-[9px] text-white"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg,#059669,#0ea5a0)",
          boxShadow: "0 3px 8px -2px rgba(5,150,105,0.55)",
        }}
      >
        <SparkLogo size={Math.round(size * 0.57)} strokeWidth={2.2} />
      </span>
      {wordmark ? (
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">PostForge</span>
      ) : null}
    </span>
  );
}
