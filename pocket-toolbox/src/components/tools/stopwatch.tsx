"use client";

import { useEffect, useRef, useState } from "react";
import ToolCard from "@/components/ToolCard";

function format(ms: number) {
  const total = Math.floor(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const centis = Math.floor((total % 1000) / 10);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now() - elapsed;
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
  };

  const btn =
    "rounded-md border border-black/[.08] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 disabled:hover:bg-transparent dark:border-white/[.145] dark:hover:bg-white/[.06]";

  return (
    <ToolCard title="Stopwatch">
      <div className="flex flex-col gap-3">
        <div className="font-mono text-3xl tabular-nums tracking-tight">
          {format(elapsed)}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => setRunning((r) => !r)}
          >
            {running ? "Stop" : "Start"}
          </button>
          <button
            type="button"
            className={btn}
            disabled={!running}
            onClick={() => setLaps((l) => [...l, elapsed])}
          >
            Lap
          </button>
          <button
            type="button"
            className={btn}
            disabled={elapsed === 0 && laps.length === 0}
            onClick={reset}
          >
            Reset
          </button>
        </div>

        {laps.length > 0 && (
          <ol className="flex flex-col gap-1 font-mono text-xs tabular-nums">
            {laps.map((lap, i) => (
              <li
                key={i}
                className="flex justify-between border-t border-black/[.06] pt-1 dark:border-white/[.1]"
              >
                <span className="opacity-60">Lap {i + 1}</span>
                <span>{format(lap)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ToolCard>
  );
}
