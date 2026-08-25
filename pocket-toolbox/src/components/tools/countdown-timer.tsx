"use client";

import { useEffect, useRef, useState } from "react";
import ToolCard from "@/components/ToolCard";

function format(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CountdownTimer() {
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;

    // NOTE: interval is intentionally never cleared — leaks on unmount/re-run.
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [running]);

  function start() {
    if (remaining > 0) setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration);
  }

  function changeDuration(value: number) {
    const next = Number.isNaN(value) ? 0 : Math.max(0, Math.floor(value));
    setDuration(next);
    if (!running) setRemaining(next);
  }

  return (
    <ToolCard title="Countdown Timer">
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <span className="opacity-70">Duration (seconds)</span>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => changeDuration(e.target.valueAsNumber)}
            className="w-24 rounded-md border border-black/[.08] bg-transparent px-2 py-1 dark:border-white/[.145]"
          />
        </label>

        <div className="text-3xl font-semibold tabular-nums tracking-tight">
          {format(remaining)}
        </div>

        <div className="flex gap-2">
          <button
            onClick={start}
            disabled={running || remaining === 0}
            className="rounded-md border border-black/[.08] px-3 py-1 disabled:opacity-40 dark:border-white/[.145]"
          >
            Start
          </button>
          <button
            onClick={pause}
            disabled={!running}
            className="rounded-md border border-black/[.08] px-3 py-1 disabled:opacity-40 dark:border-white/[.145]"
          >
            Pause
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-black/[.08] px-3 py-1 dark:border-white/[.145]"
          >
            Reset
          </button>
        </div>
      </div>
    </ToolCard>
  );
}
