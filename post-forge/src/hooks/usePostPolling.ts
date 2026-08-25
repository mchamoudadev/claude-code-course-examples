"use client";

/**
 * usePostPolling — the live-progress transport for the pipeline showcase (T11).
 *
 * Polls `GET /api/posts/[id]` on a fixed interval and exposes the latest
 * PostDetail. Per the locked decision, "streaming" is reveal-on-update via
 * polling (no token streaming). The loop:
 *   - fetches immediately on mount, then every ~1.8s,
 *   - STOPS permanently once the run reaches a terminal status (done/failed) or
 *     the post 404s (nothing left to observe),
 *   - PAUSES while the tab is hidden and RESUMES (with an immediate refetch) on
 *     return, so a run picked back up mid-flight snaps to current state,
 *   - aborts the in-flight request + clears its timer on unmount / id change.
 *
 * Transient failures (network blips, 5xx) keep the loop alive so a run isn't
 * abandoned over one bad response; the last-good `data` stays on screen. State
 * is tagged with the id it belongs to (`forId`) so a mid-flight id change reads
 * as "loading" without a synchronous reset.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, PostDetail } from "@/lib/dto";

/** Poll cadence. Inside the BRD's 1.5–2s window. */
const POLL_INTERVAL_MS = 1800;

const TERMINAL_STATUSES = new Set(["done", "failed"]);

/** A run in a terminal status has nothing left to reveal — stop polling. */
function isTerminalStatus(status: string | undefined): boolean {
  return status !== undefined && TERMINAL_STATUSES.has(status);
}

interface PollState {
  /** The id this snapshot describes (guards against a mid-flight id change). */
  forId: string;
  data: PostDetail | null;
  error: string | null;
  notFound: boolean;
  /** True once the first response (success OR error) for `forId` has resolved. */
  loaded: boolean;
}

export interface UsePostPollingResult {
  /** Latest poll payload, or null until the first successful response. */
  data: PostDetail | null;
  /** Human-readable message for the most recent failed poll (transient or fatal). */
  error: string | null;
  /** True until the first response (success OR error) for this id resolves. */
  isInitialLoading: boolean;
  /** True when the post id does not exist (404) — a fatal, non-retried state. */
  notFound: boolean;
  /** Force an out-of-band refetch (no-op once terminal or hidden). */
  refetch: () => void;
}

export function usePostPolling(id: string): UsePostPollingResult {
  const [state, setState] = useState<PollState>(() => ({
    forId: id,
    data: null,
    error: null,
    notFound: false,
    loaded: false,
  }));

  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Latched once the run is terminal / not-found — the loop never fetches again.
  const doneRef = useRef(false);
  // A fetch is in flight — avoid overlapping requests when a tick fires early.
  const inFlightRef = useRef(false);
  // Latest tick fn, so the stable `refetch` can reach into the active effect.
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;
    inFlightRef.current = false;

    const stopInterval = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const fetchOnce = async () => {
      // Supersede any in-flight request so responses never land out of order.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(`/api/posts/${id}`, {
          signal: ctrl.signal,
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (cancelled) return;

        if (res.status === 404) {
          doneRef.current = true;
          stopInterval();
          setState({ forId: id, data: null, error: "This run could not be found.", notFound: true, loaded: true });
          return;
        }

        if (!res.ok) {
          let message = `The run couldn't be reached (${res.status}).`;
          try {
            const body = (await res.json()) as ApiError;
            if (body?.error?.message) message = body.error.message;
          } catch {
            /* non-JSON error body — keep the generic message */
          }
          if (cancelled) return;
          // Transient — keep the loop + last-good data alive.
          setState((s) => ({ ...s, forId: id, error: message, loaded: true }));
          return;
        }

        const post = (await res.json()) as PostDetail;
        if (cancelled) return;
        if (isTerminalStatus(post.status)) {
          doneRef.current = true;
          stopInterval();
        }
        setState({ forId: id, data: post, error: null, notFound: false, loaded: true });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState((s) => ({
          ...s,
          forId: id,
          error: err instanceof Error ? err.message : "Network error.",
          loaded: true,
        }));
      }
    };

    const tick = () => {
      if (cancelled || doneRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void fetchOnce().finally(() => {
        inFlightRef.current = false;
      });
    };
    tickRef.current = tick;

    // Kick off immediately, then hand over to the interval.
    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);

    // Pause while hidden (tick self-skips); resume + refetch on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      stopInterval();
      abortRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      tickRef.current = () => {};
    };
  }, [id]);

  const refetch = useCallback(() => {
    tickRef.current();
  }, []);

  const forThisId = state.forId === id;
  return {
    data: forThisId ? state.data : null,
    error: forThisId ? state.error : null,
    isInitialLoading: !forThisId || !state.loaded,
    notFound: forThisId ? state.notFound : false,
    refetch,
  };
}
