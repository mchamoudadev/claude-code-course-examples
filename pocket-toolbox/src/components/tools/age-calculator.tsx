"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

type Age = { years: number; months: number; days: number };

function computeAge(birth: Date, today: Date): Age | null {
  if (birth.getTime() > today.getTime()) return null;

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    // borrow days from the previous month (length of that month)
    const borrowed = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += borrowed;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

export default function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("");

  const parsed = birthDate ? new Date(`${birthDate}T00:00:00`) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const age = valid ? computeAge(parsed, today) : null;

  return (
    <ToolCard title="Age Calculator">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Birth date</span>
          <input
            type="date"
            value={birthDate}
            max={today.toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
        </label>

        <div className="mt-1 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          {age ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col gap-1">
                <dd className="text-lg font-medium tabular-nums">{age.years}</dd>
                <dt className="opacity-70">Years</dt>
              </div>
              <div className="flex flex-col gap-1">
                <dd className="text-lg font-medium tabular-nums">{age.months}</dd>
                <dt className="opacity-70">Months</dt>
              </div>
              <div className="flex flex-col gap-1">
                <dd className="text-lg font-medium tabular-nums">{age.days}</dd>
                <dt className="opacity-70">Days</dt>
              </div>
            </dl>
          ) : (
            <p className="opacity-60">
              {valid
                ? "Birth date can't be in the future."
                : "Enter a birth date to see your age."}
            </p>
          )}
        </div>
      </div>
    </ToolCard>
  );
}
