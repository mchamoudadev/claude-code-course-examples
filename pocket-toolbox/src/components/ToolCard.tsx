import type { ReactNode } from "react";

export default function ToolCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}
