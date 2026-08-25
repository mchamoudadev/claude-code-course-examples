import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components";

/**
 * Centered auth shell (sign-in / sign-up). Provides the Auth screen chrome —
 * soft mint radiance + a home-linked brand lockup — around the form card.
 * NOT a root layout: the root `layout.tsx` still owns <html>/<body>.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(680px 320px at 50% -8%, #EAFBF2, transparent)" }}
      />
      <div className="relative flex h-16 items-center px-6">
        <Link href="/" aria-label="PostForge home" className="rounded-md">
          <Logo size={28} />
        </Link>
      </div>
      <main className="relative flex flex-1 items-center justify-center px-6 pb-16 pt-5">
        {children}
      </main>
    </div>
  );
}
