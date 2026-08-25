"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting. Returns `false` on the
 * server and first client render (so markup is stable / no hydration mismatch),
 * then updates once mounted and on subsequent OS-level changes.
 *
 * CSS animations are already neutralized globally by the reduced-motion media
 * query in globals.css; this hook is for JS-driven motion (typewriter, the
 * pipeline "active" sweep) that CSS can't reach.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
