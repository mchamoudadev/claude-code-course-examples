"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CalendarIcon,
  PencilIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/ui/icons";
import type { ScheduleDTO } from "@/lib/schedules-repo";
import { cadenceSummary, formatRelative, formatWhen } from "./cadence";

export interface ScheduleCardProps {
  schedule: ScheduleDTO;
  toggling?: boolean;
  running?: boolean;
  onToggle: (enabled: boolean) => void;
  onRunNow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const RESULT_TONE: Record<"ok" | "failed" | "skipped", BadgeTone> = {
  ok: "success",
  failed: "error",
  skipped: "warning",
};

const RESULT_LABEL: Record<"ok" | "failed" | "skipped", string> = {
  ok: "Success",
  failed: "Failed",
  skipped: "Skipped",
};

function Meta({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-faint">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5 text-[13px] text-body">
        {icon}
        <span className="min-w-0 truncate">{children}</span>
      </dd>
    </div>
  );
}

export function ScheduleCard({
  schedule,
  toggling = false,
  running = false,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: ScheduleCardProps) {
  const { enabled, cadence, timezone, nextRun, lastResult } = schedule;
  const title = schedule.topic?.trim() || "Trending theme";
  const isTheme = !schedule.topic && Boolean(schedule.themeSource);

  return (
    <Card padded className="transition-shadow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: identity + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold text-ink">
              {title}
            </h3>
            {enabled ? (
              <Badge tone="success" dot>
                Active
              </Badge>
            ) : (
              <Badge tone="neutral" dot>
                Paused
              </Badge>
            )}
            {isTheme ? <Badge tone="primary">Auto-topic</Badge> : null}
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
            <Meta label="Cadence" icon={<CalendarIcon size={14} className="text-muted" />}>
              <span title={`Timezone: ${timezone}`}>{cadenceSummary(cadence)}</span>
            </Meta>
            <Meta label="Next run">
              {!enabled ? (
                <span className="text-muted">Paused</span>
              ) : nextRun ? (
                <span title={formatWhen(nextRun, timezone)}>
                  {formatRelative(nextRun)}
                </span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </Meta>
            <Meta label="Last result">
              {lastResult ? (
                <span className="inline-flex items-center gap-2">
                  <Badge tone={RESULT_TONE[lastResult.status]}>
                    {RESULT_LABEL[lastResult.status]}
                  </Badge>
                  <span className="text-muted">{formatRelative(lastResult.at)}</span>
                </span>
              ) : (
                <span className="text-muted">Never run</span>
              )}
            </Meta>
          </dl>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={enabled}
            disabled={toggling}
            onChange={onToggle}
            aria-label={enabled ? "Disable schedule" : "Enable schedule"}
            className="mr-1"
          />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshIcon size={14} />}
            loading={running}
            onClick={onRunNow}
          >
            Run now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Edit schedule"
            onClick={onEdit}
            className="px-2"
          >
            <PencilIcon size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete schedule"
            onClick={onDelete}
            className="px-2 text-muted hover:text-error-fg"
          >
            <TrashIcon size={15} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
