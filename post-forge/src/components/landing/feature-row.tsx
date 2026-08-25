import type { ReactNode } from "react";
import { CalendarIcon, LibraryIcon } from "@/components";

interface RowFeature {
  icon: ReactNode;
  color: string;
  tint: string;
  title: string;
  body: string;
}

const ROW: RowFeature[] = [
  {
    icon: <LibraryIcon size={18} />,
    color: "#059669",
    tint: "#F0FBF6",
    title: "A library that grows itself",
    body: "Every finished post lands in a searchable, filterable library — poster, sources and metadata attached.",
  },
  {
    icon: <CalendarIcon size={18} />,
    color: "#4F46E5",
    tint: "#EEF2FF",
    title: "Set it and forget it",
    body: "Schedule recurring posts on a topic or trending theme. PostForge runs the whole pipeline on cadence.",
  },
];

/** Secondary feature pair: the library + scheduling. */
export function FeatureRow() {
  return (
    <section aria-label="Library and scheduling" className="mx-auto mt-16 max-w-[1080px] px-6">
      <ul className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {ROW.map((f) => (
          <li key={f.title} className="rounded-[18px] border border-border bg-surface p-7">
            <div className="mb-2 flex items-center gap-[11px]">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: f.tint, color: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="text-[17px] font-semibold">{f.title}</h3>
            </div>
            <p className="text-sm leading-[1.55] text-secondary">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
