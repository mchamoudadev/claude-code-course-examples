"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

const UNITS = ["m", "cm", "km", "in", "ft", "mi"] as const;
type Unit = (typeof UNITS)[number];

// Each factor is the number of meters in one of that unit.
const TO_METERS: Record<Unit, number> = {
  m: 1,
  cm: 0.01,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  mi: 1609.344,
};

function formatResult(n: number): string {
  // Round to 6 decimals, then trim trailing zeros.
  return parseFloat(n.toFixed(6)).toString();
}

export default function UnitConverter() {
  const [value, setValue] = useState("");
  const [from, setFrom] = useState<Unit>("km");
  const [to, setTo] = useState<Unit>("m");

  const parsed = parseFloat(value);
  const hasValue = value.trim() !== "" && !Number.isNaN(parsed);
  const converted = hasValue
    ? (parsed * TO_METERS[from]) / TO_METERS[to]
    : null;

  const selectClass =
    "rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]";

  return (
    <ToolCard title="Unit Converter">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Value</span>
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="opacity-70">From</span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as Unit)}
              className={selectClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1">
            <span className="opacity-70">To</span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as Unit)}
              className={selectClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-1 flex justify-between border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <span className="opacity-70">Result</span>
          <span className="font-medium tabular-nums">
            {converted === null ? (
              <span className="opacity-60">—</span>
            ) : (
              `${formatResult(converted)} ${to}`
            )}
          </span>
        </div>
      </div>
    </ToolCard>
  );
}
