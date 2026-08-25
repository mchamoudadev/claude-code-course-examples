"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui";
import { posterGradient } from "./post-meta";

export interface PosterThumbProps {
  /** GridFS poster id; streamed from GET /api/posters/[id]. */
  posterImageId?: string;
  /** Deterministic gradient seed (post id, falling back to topic). */
  seed: string;
  /** Alt text for the poster image. */
  alt?: string;
  /** Overlay content rendered above the image (e.g. a serif topic on cards). */
  children?: ReactNode;
  /** Applied to the root — controls size + border radius. */
  className?: string;
}

/**
 * Poster thumbnail with a deterministic gradient fallback. Every seeded failed /
 * in-flight post is missing its poster (Illustrate hasn't run), so the gradient
 * is the resilient default; the streamed image fades in over it once loaded and
 * silently falls back to the gradient on a load error.
 */
export function PosterThumb({ posterImageId, seed, alt, children, className }: PosterThumbProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(posterImageId) && !failed;

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-sunken", className)}
      style={{ background: posterGradient(seed) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin GridFS stream; next/image adds no value here
        <img
          src={`/api/posters/${posterImageId}`}
          alt={alt ?? ""}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {children}
    </div>
  );
}
