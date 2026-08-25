import Link from "next/link";
import { Logo } from "@/components";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

/** Sticky, translucent marketing nav: brand, section anchors, auth CTAs. */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-[200] border-b border-[#EBEEED] bg-[rgba(247,248,248,0.8)] backdrop-blur-[12px]">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1160px] items-center gap-3.5 px-6"
      >
        <Link href="/" aria-label="PostForge home" className="rounded-md">
          <Logo size={30} />
        </Link>
        <div className="ml-7 hidden gap-0.5 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-border-subtle"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/sign-in"
            className="inline-flex h-[38px] items-center rounded-[9px] px-[15px] text-sm font-medium text-body transition-colors hover:bg-border-subtle"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-[38px] items-center rounded-[9px] bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-[#232B28]"
          >
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
