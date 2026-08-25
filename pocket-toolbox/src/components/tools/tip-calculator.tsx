"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

export default function TipCalculator() {
  const [bill, setBill] = useState("");
  const [tipPercent, setTipPercent] = useState("15");
  const [people, setPeople] = useState("1");

  // NOTE: no NaN guard here on purpose — parseFloat("") is NaN.
  const billValue = parseFloat(bill);
  const tipValue = parseFloat(tipPercent);
  const peopleValue = parseInt(people, 10);

  const tipAmount = billValue * (tipValue / 100);
  const grandTotal = billValue + tipAmount;
  const perPerson = grandTotal / peopleValue;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <ToolCard title="Tip Calculator">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Bill total</span>
          <input
            type="number"
            inputMode="decimal"
            value={bill}
            onChange={(e) => setBill(e.target.value)}
            placeholder="0.00"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="opacity-70">Tip %</span>
          <input
            type="number"
            inputMode="decimal"
            value={tipPercent}
            onChange={(e) => setTipPercent(e.target.value)}
            placeholder="15"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="opacity-70">Split between (people)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            placeholder="1"
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <dl className="mt-1 flex flex-col gap-1 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <div className="flex justify-between">
            <dt className="opacity-70">Tip amount</dt>
            <dd className="font-medium tabular-nums">{fmt(tipAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Grand total</dt>
            <dd className="font-medium tabular-nums">{fmt(grandTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-70">Per person</dt>
            <dd className="font-medium tabular-nums">{fmt(perPerson)}</dd>
          </div>
        </dl>
      </div>
    </ToolCard>
  );
}
