"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  RefreshIcon,
  Spinner,
  cn,
} from "@/components/ui";
import { SettingsSection } from "./settings-section";
import { INTEGRATIONS, type IntegrationMeta, type TestProvider } from "./constants";

/** Per-provider probe state on the client. */
type ProbeStatus = "idle" | "testing" | "ok" | "error";

interface ProbeState {
  status: ProbeStatus;
  message?: string;
}

interface TestResponse {
  provider: TestProvider;
  ok: boolean;
  message: string;
}

const STATUS_BADGE: Record<ProbeStatus, { tone: "neutral" | "info" | "success" | "error"; label: string }> = {
  idle: { tone: "neutral", label: "Not tested" },
  testing: { tone: "info", label: "Testing…" },
  ok: { tone: "success", label: "Connected" },
  error: { tone: "error", label: "Error" },
};

/**
 * Integrations — status + a test-connection button per provider. Locked
 * decision: keys are env-only, so there is NO key input anywhere. Each row shows
 * the (non-secret) env-var name it reads and a button that hits the server-side
 * probe at POST /api/settings/test; the returned {ok,message} drives the badge.
 */
export function IntegrationsSection() {
  const [probes, setProbes] = useState<Record<string, ProbeState>>(() =>
    Object.fromEntries(INTEGRATIONS.map((i) => [i.id, { status: "idle" as ProbeStatus }])),
  );

  async function test(provider: TestProvider) {
    setProbes((prev) => ({ ...prev, [provider]: { status: "testing" } }));
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json().catch(() => null)) as TestResponse | null;
      const ok = Boolean(data?.ok);
      setProbes((prev) => ({
        ...prev,
        [provider]: {
          status: ok ? "ok" : "error",
          message: data?.message ?? `Request failed (HTTP ${res.status}).`,
        },
      }));
    } catch (err) {
      setProbes((prev) => ({
        ...prev,
        [provider]: {
          status: "error",
          message: err instanceof Error ? err.message : "Network request failed.",
        },
      }));
    }
  }

  return (
    <SettingsSection
      title="Integrations"
      description="API keys live in the environment only — this screen never shows or accepts them. Use Test connection to verify each provider is reachable."
    >
      <Card className="divide-y divide-border-subtle">
        {INTEGRATIONS.map((integration) => (
          <IntegrationRow
            key={integration.id}
            integration={integration}
            probe={probes[integration.id]}
            onTest={() => test(integration.id)}
          />
        ))}
      </Card>
    </SettingsSection>
  );
}

function IntegrationRow({
  integration,
  probe,
  onTest,
}: {
  integration: IntegrationMeta;
  probe: ProbeState;
  onTest: () => void;
}) {
  const { Icon } = integration;
  const badge = STATUS_BADGE[probe.status];
  const testing = probe.status === "testing";

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-sunken text-secondary">
          <Icon size={19} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14.5px] font-semibold text-ink">{integration.name}</h3>
            <Badge tone={badge.tone} dot={probe.status !== "testing"}>
              {testing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size={11} color="var(--color-info)" />
                  {badge.label}
                </span>
              ) : (
                badge.label
              )}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-secondary">{integration.description}</p>
          <p className="mt-1.5 text-[12px] text-faint">
            Reads <code className="font-mono text-[11.5px] text-muted">{integration.envVar}</code>
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onTest}
          loading={testing}
          leftIcon={testing ? undefined : <RefreshIcon size={14} />}
          className="shrink-0"
        >
          Test connection
        </Button>
      </div>

      {probe.message ? (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed",
            probe.status === "ok"
              ? "border-verified-border bg-verified-tint text-verified-fg"
              : probe.status === "error"
                ? "border-error-border bg-error-tint text-error-fg"
                : "border-border bg-surface-sunken text-secondary",
          )}
        >
          {probe.message}
        </p>
      ) : null}
    </div>
  );
}
