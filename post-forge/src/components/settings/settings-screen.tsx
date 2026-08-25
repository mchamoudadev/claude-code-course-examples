"use client";

import { useEffect, useState } from "react";
import { Button, Card, Skeleton } from "@/components/ui";
import type { SettingsDTO } from "@/lib/dto";
import { ProfileSection } from "./profile-section";
import { IntegrationsSection } from "./integrations-section";
import { DefaultsSection } from "./defaults-section";
import { DangerZone } from "./danger-zone";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settings: SettingsDTO };

/** Fetch the persisted defaults, resolving to a terminal Load (never throws). */
async function loadSettings(): Promise<Load> {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) {
      return { status: "error", message: `Could not load settings (HTTP ${res.status}).` };
    }
    const settings = (await res.json()) as SettingsDTO;
    return { status: "ready", settings };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Could not load settings.",
    };
  }
}

/**
 * Settings screen shell. Loads the persisted generation defaults once, then
 * composes the four sections. Integrations / Danger zone don't depend on the
 * fetch, so only the Defaults block waits on (and can retry) it.
 */
export function SettingsScreen() {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((result) => {
      if (!cancelled) setLoad(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retry() {
    setLoad({ status: "loading" });
    setLoad(await loadSettings());
  }

  return (
    <div className="mx-auto max-w-[880px] pb-4">
      <header className="mb-8">
        <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
        <p className="mt-2 max-w-[600px] text-[15px] text-secondary">
          Manage your account, verify integrations, set generation defaults, and run destructive
          maintenance. API keys are configured in the environment, never here.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <ProfileSection />
        <IntegrationsSection />

        {load.status === "ready" ? (
          <DefaultsSection
            initial={load.settings}
            onSaved={(settings) => setLoad({ status: "ready", settings })}
          />
        ) : load.status === "error" ? (
          <Card padded>
            <p className="text-[13.5px] text-error-fg">{load.message}</p>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => void retry()}>
                Retry
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton width={180} height={22} radius={8} />
            <Skeleton height={220} radius={16} className="w-full" />
          </div>
        )}

        <DangerZone />
      </div>
    </div>
  );
}
