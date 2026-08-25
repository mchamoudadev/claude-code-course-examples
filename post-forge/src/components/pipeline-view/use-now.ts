"use client";

import { useEffect, useState } from "react";

/**
 * A once-per-second clock used to drive the live elapsed timers. It advances
 * only while `active` (i.e. the run is still in flight) so a finished run
 * settles on a frozen elapsed value and stops re-rendering. This is a numeric
 * readout, not motion, so it stays useful under reduced-motion.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    // setState lives in the interval callback (a subscription), not the effect
    // body, so the timer stays the single source of updates.
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return now;
}
