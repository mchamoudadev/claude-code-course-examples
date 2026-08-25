"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

const SIDE_OPTIONS = [4, 6, 8, 10, 12, 20];

export default function DiceRoller() {
  const [count, setCount] = useState("2");
  const [sides, setSides] = useState("6");
  const [rolls, setRolls] = useState<number[]>([]);

  const roll = () => {
    const n = Math.min(20, Math.max(1, Math.floor(Number(count)) || 1));
    const s = Math.max(2, Math.floor(Number(sides)) || 6);
    const results = Array.from(
      { length: n },
      () => Math.floor(Math.random() * s) + 1,
    );
    setRolls(results);
  };

  const total = rolls.reduce((sum, value) => sum + value, 0);

  return (
    <ToolCard title="Dice Roller">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Number of dice</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="2"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="opacity-70">Sides per die</span>
          <select
            value={sides}
            onChange={(e) => setSides(e.target.value)}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          >
            {SIDE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                d{option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={roll}
          className="rounded-md border border-black/[.12] px-3 py-1 dark:border-white/[.18]"
        >
          Roll
        </button>

        {rolls.length > 0 && (
          <div className="mt-1 flex flex-col gap-3 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
            <div className="flex flex-wrap gap-2">
              {rolls.map((value, index) => (
                <span
                  key={index}
                  className="rounded-lg border border-black/[.08] p-3 font-medium tabular-nums dark:border-white/[.145]"
                >
                  {value}
                </span>
              ))}
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Total</span>
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        )}
      </div>
    </ToolCard>
  );
}
