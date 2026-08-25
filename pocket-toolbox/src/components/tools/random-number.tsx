"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

export default function RandomNumber() {
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [result, setResult] = useState<number | null>(null);

  const minValue = parseInt(min, 10);
  const maxValue = parseInt(max, 10);
  const invalid = Number.isNaN(minValue) || Number.isNaN(maxValue);

  const pick = () => {
    if (invalid) return;
    const lo = Math.min(minValue, maxValue);
    const hi = Math.max(minValue, maxValue);
    setResult(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  };

  return (
    <ToolCard title="Random Number">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Min</span>
          <input
            type="number"
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="1"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="opacity-70">Max</span>
          <input
            type="number"
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="100"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <button
          type="button"
          onClick={pick}
          disabled={invalid}
          className="rounded-md border border-black/[.12] px-3 py-1 disabled:opacity-40 dark:border-white/[.18]"
        >
          Pick
        </button>

        <div className="border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          {invalid ? (
            <p className="opacity-60">Enter valid min and max numbers.</p>
          ) : result === null ? (
            <p className="opacity-60">Press Pick to generate a number.</p>
          ) : (
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {result}
            </p>
          )}
        </div>
      </div>
    </ToolCard>
  );
}
