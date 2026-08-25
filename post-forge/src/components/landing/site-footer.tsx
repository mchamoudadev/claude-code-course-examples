import { Logo } from "@/components";

/** Marketing footer: brand lockup, tagline, legal links. */
export function SiteFooter() {
  return (
    <footer className="border-t border-[#EBEEED] bg-surface">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-4 px-6 py-10">
        <Logo size={26} />
        <span className="text-[13px] text-secondary">
          © 2026 PostForge. Autonomous content, cited.
        </span>
        <nav aria-label="Footer" className="ml-auto flex gap-5 text-[13.5px] text-secondary">
          <a href="#" className="rounded transition-colors hover:text-ink">
            Privacy
          </a>
          <a href="#" className="rounded transition-colors hover:text-ink">
            Terms
          </a>
          <a href="#" className="rounded transition-colors hover:text-ink">
            Docs
          </a>
        </nav>
      </div>
    </footer>
  );
}
