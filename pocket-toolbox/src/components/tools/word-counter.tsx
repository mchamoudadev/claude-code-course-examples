"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function countSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  return matches ? matches.length : 0;
}

export default function WordCounter() {
  const [text, setText] = useState("");

  const stats = [
    { label: "Words", value: countWords(text) },
    { label: "Characters", value: text.length },
    { label: "Sentences", value: countSentences(text) },
  ];

  return (
    <ToolCard title="Word Counter">
      <div className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type text here…"
          rows={5}
          className="w-full resize-y rounded-lg border border-black/[.08] bg-transparent p-3 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/40"
        />
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
            >
              <span className="text-lg font-semibold tabular-nums">{s.value}</span>
              <span className="text-xs opacity-60">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
}
