"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

type Side = "Heads" | "Tails";

export default function CoinFlip() {
  const [result, setResult] = useState<Side | null>(null);
  const [heads, setHeads] = useState(0);
  const [tails, setTails] = useState(0);

  const flip = () => {
    const side: Side = Math.random() < 0.5 ? "Heads" : "Tails";
    setResult(side);
    if (side === "Heads") setHeads((n) => n + 1);
    else setTails((n) => n + 1);
  };

  const reset = () => {
    setResult(null);
    setHeads(0);
    setTails(0);
  };

  const total = heads + tails;

  const btn =
    "rounded-md border border-black/[.12] px-3 py-1 transition-colors hover:bg-black/[.04] disabled:opacity-40 disabled:hover:bg-transparent dark:border-white/[.18] dark:hover:bg-white/[.06]";

  return (
    <ToolCard title="Coin Flip">
      <div className="flex flex-col gap-3">
        <div className="text-3xl font-semibold tracking-tight">
          {result ?? <span className="opacity-60">—</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={flip}>
            Flip
          </button>
          <button
            type="button"
            className={btn}
            disabled={total === 0}
            onClick={reset}
          >
            Reset
          </button>
        </div>

        <dl className="flex flex-col gap-1 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <div className="flex justify-between">
            <dt className="opacity-70">Heads</dt>
            <dd className="font-medium tabular-nums">{heads}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Tails</dt>
            <dd className="font-medium tabular-nums">{tails}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Total flips</dt>
            <dd className="font-medium tabular-nums">{total}</dd>
          </div>
        </dl>
      </div>
    </ToolCard>
  );
}
