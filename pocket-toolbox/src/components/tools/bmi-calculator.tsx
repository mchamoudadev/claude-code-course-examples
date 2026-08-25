"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

function category(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function BmiCalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const heightCm = parseFloat(height);
  const weightKg = parseFloat(weight);

  const valid =
    Number.isFinite(heightCm) &&
    Number.isFinite(weightKg) &&
    heightCm > 0 &&
    weightKg > 0;

  const heightM = heightCm / 100;
  const bmi = valid ? weightKg / (heightM * heightM) : null;

  return (
    <ToolCard title="BMI Calculator">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Height (cm)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="170"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="opacity-70">Weight (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="65"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <dl className="mt-1 flex flex-col gap-1 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <div className="flex justify-between">
            <dt className="opacity-70">BMI</dt>
            <dd className="font-medium tabular-nums">
              {bmi === null ? "—" : bmi.toFixed(1)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Category</dt>
            <dd className="font-medium">
              {bmi === null ? (
                <span className="opacity-60">Enter height &amp; weight</span>
              ) : (
                category(bmi)
              )}
            </dd>
          </div>
        </dl>
      </div>
    </ToolCard>
  );
}
