"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/nav";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

/** Local hamburger glyph (the design-system icon set has no menu icon). */
function MenuIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** Account menu — shows the signed-in user and signs out via the real session. */
function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load the real signed-in user (proxy guarantees a session on app pages).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { user?: { username?: string } };
        if (!cancelled && data.user?.username) setUsername(data.user.username);
      } catch {
        // Non-fatal — the avatar just falls back to a generic label.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, send the user to sign-in.
    }
    // Full navigation so the proxy re-evaluates the cleared session cookie.
    window.location.assign("/sign-in");
  }

  const label = username ?? "Account";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-surface-sunken"
      >
        <Avatar name={label} size={34} />
        <ChevronDownIcon size={15} className="hidden text-muted sm:block" />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-up absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <div className="text-[13.5px] font-semibold text-ink">{label}</div>
            <div className="text-[12px] text-muted">Signed in</div>
          </div>
          <div className="my-1 h-px bg-divider" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-[13.5px] text-body transition-colors hover:bg-surface-sunken"
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-[13.5px] text-body transition-colors hover:bg-surface-sunken disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export interface TopbarProps {
  /** Opens the mobile navigation drawer. */
  onOpenMobileNav: () => void;
  className?: string;
}

/**
 * Persistent top bar: brand lockup, global search (navigates to Library with a
 * `?q=` query), the primary "New Post" CTA, and a cosmetic account menu.
 */
export function Topbar({ onOpenMobileNav, className }: TopbarProps) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/library?q=${encodeURIComponent(query)}` : "/library");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:px-5",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
      >
        <MenuIcon />
      </button>

      <Link href="/dashboard" aria-label="PostForge — dashboard" className="shrink-0">
        <Logo />
      </Link>

      <form
        role="search"
        onSubmit={submitSearch}
        className="ml-2 hidden max-w-[440px] flex-1 sm:block"
      >
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search posts and topics"
          placeholder="Search posts, topics…"
          leftIcon={<SearchIcon size={16} />}
          className="h-[40px]"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button
          onClick={() => router.push("/new-post")}
          leftIcon={<PlusIcon size={16} />}
          aria-label="New Post"
        >
          <span className="hidden sm:inline">New Post</span>
        </Button>
        <AccountMenu />
      </div>
    </header>
  );
}
