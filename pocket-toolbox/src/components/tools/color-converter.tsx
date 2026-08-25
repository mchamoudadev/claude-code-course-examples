"use client";

import { useState } from "react";
import ToolCard from "@/components/ToolCard";

type Rgb = { r: number; g: number; b: number };

const clampByte = (n: number) => Math.max(0, Math.min(255, n));

// Parse a HEX string into RGB. Tolerates a missing "#" and 3-digit shorthand.
// Returns null when the input isn't a valid 3- or 6-digit hex color.
function hexToRgb(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "");

  let full = hex;
  if (hex.length === 3) {
    full = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Parse a free-form numeric channel value; empty / invalid becomes 0.
function parseChannel(value: string): number {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : clampByte(n);
}

export default function ColorConverter() {
  const [hex, setHex] = useState("#3b82f6");
  const [rgb, setRgb] = useState<Rgb>({ r: 59, g: 130, b: 246 });

  const parsed = hexToRgb(hex);
  const valid = parsed !== null;
  const swatch = valid ? rgbToHex(parsed) : rgbToHex(rgb);

  const handleHexChange = (value: string) => {
    setHex(value);
    const next = hexToRgb(value);
    if (next) setRgb(next);
  };

  const handleChannelChange = (channel: keyof Rgb, value: string) => {
    const next = { ...rgb, [channel]: parseChannel(value) };
    setRgb(next);
    setHex(rgbToHex(next));
  };

  const channels: { key: keyof Rgb; label: string }[] = [
    { key: "r", label: "R" },
    { key: "g", label: "G" },
    { key: "b", label: "B" },
  ];

  return (
    <ToolCard title="Color Converter">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="opacity-70">HEX</span>
          <input
            type="text"
            value={hex}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#3b82f6"
            spellCheck={false}
            className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
          />
          {!valid && (
            <span className="text-xs opacity-60">
              Enter a 3- or 6-digit hex color (e.g. #3b82f6).
            </span>
          )}
        </label>

        <div className="grid grid-cols-3 gap-2">
          {channels.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="opacity-70">{label}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={255}
                value={rgb[key]}
                onChange={(e) => handleChannelChange(key, e.target.value)}
                className="rounded-md border border-black/[.12] bg-transparent px-2 py-1 dark:border-white/[.18]"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <div
            className="h-12 w-12 shrink-0 rounded-md border border-black/[.12] dark:border-white/[.18]"
            style={{ backgroundColor: swatch }}
            aria-label="Color preview"
          />
          <dl className="flex flex-col gap-1">
            <div className="flex gap-2">
              <dt className="opacity-70">HEX</dt>
              <dd className="font-medium tabular-nums">{swatch}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="opacity-70">RGB</dt>
              <dd className="font-medium tabular-nums">
                {rgb.r}, {rgb.g}, {rgb.b}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </ToolCard>
  );
}
