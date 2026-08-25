"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@/components/ui";

/**
 * The dashboard's prominent "start a new post" entry. Hands the typed topic off
 * to the New Post composer (T10) via a `?topic=` query param so the flow is
 * forward-compatible; an empty box just opens the composer.
 */
export function StartPostHero() {
  const router = useRouter();
  const [topic, setTopic] = useState("");

  const start = () => {
    const t = topic.trim();
    router.push(t ? `/new-post?topic=${encodeURIComponent(t)}` : "/new-post");
  };

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(120deg,#0b1210,#132720)] p-6 sm:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,#0e5c44,transparent_70%)] opacity-60" />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="min-w-[220px] flex-1">
          <div className="mb-2 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-primary-400">
            Start a new post
          </div>
          <div className="text-[19px] font-semibold tracking-[-0.01em] text-white">
            What should the agents write about today?
          </div>
        </div>
        <form
          className="flex min-w-[300px] flex-1 gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Post topic"
            placeholder="e.g. Humanoid robots in 2026"
            className="h-[46px] flex-1 rounded-[11px] border border-[#2b3a34] bg-[#0c1512] px-[15px] text-[14.5px] text-white outline-none placeholder:text-[#6b7a72] focus:border-primary focus:shadow-[0_0_0_3px_rgba(5,150,105,0.25)]"
          />
          <button
            type="submit"
            className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-[11px] bg-primary px-[18px] text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Generate
            <ArrowRightIcon size={15} strokeWidth={2.3} />
          </button>
        </form>
      </div>
    </div>
  );
}
