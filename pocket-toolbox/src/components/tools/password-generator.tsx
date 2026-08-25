"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
} as const;

type SetKey = keyof typeof SETS;

const MIN_LEN = 4;
const MAX_LEN = 64;

function randomFrom(chars: string) {
  const max = Math.floor(0xffffffff / chars.length) * chars.length;
  const buf = new Uint32Array(1);
  let n = max;
  // Rejection sampling to avoid modulo bias.
  while (n >= max) {
    crypto.getRandomValues(buf);
    n = buf[0];
  }
  return chars[n % chars.length];
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [sets, setSets] = useState<Record<SetKey, boolean>>({
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: false,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const noneSelected = !Object.values(sets).some(Boolean);

  const toggleSet = (key: SetKey) => {
    setSets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generate = () => {
    const pool = (Object.keys(SETS) as SetKey[])
      .filter((key) => sets[key])
      .map((key) => SETS[key])
      .join("");
    if (!pool) return;

    let next = "";
    for (let i = 0; i < length; i++) {
      next += randomFrom(pool);
    }
    setPassword(next);
    setCopied(false);
  };

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ToolCard title="Password Generator">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">Length: {length}</span>
          <input
            type="range"
            min={MIN_LEN}
            max={MAX_LEN}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>

        <div className="flex flex-col gap-2">
          {(Object.keys(SETS) as SetKey[]).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sets[key]}
                onChange={() => toggleSet(key)}
              />
              <span className="capitalize">{key}</span>
            </label>
          ))}
        </div>

        {noneSelected && (
          <p className="opacity-60">Select at least one character set.</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={noneSelected}
            className="rounded-md border border-black/[.12] px-3 py-1 disabled:opacity-40 dark:border-white/[.18]"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={!password}
            className="rounded-md border border-black/[.12] px-3 py-1 disabled:opacity-40 dark:border-white/[.18]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="rounded-md border border-black/[.08] p-3 font-mono break-all dark:border-white/[.145]">
          {password || <span className="opacity-60">No password yet</span>}
        </div>
      </div>
    </ToolCard>
  );
}
