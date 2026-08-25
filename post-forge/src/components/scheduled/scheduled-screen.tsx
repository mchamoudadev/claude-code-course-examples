"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CalendarIcon, PlusIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/shell";
import type { ApiError } from "@/lib/dto";
import type { ScheduleDTO } from "@/lib/schedules-repo";
import { ScheduleCard } from "./schedule-card";
import {
  ScheduleFormModal,
  type ScheduleFormPayload,
} from "./schedule-form-modal";

interface SchedulesResponse {
  items: ScheduleDTO[];
}

/** Read an `{ error: { message } }` body, falling back to a status line. */
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError;
    if (body?.error?.message) return body.error.message;
  } catch {
    // non-JSON body
  }
  return `Request failed (${res.status})`;
}

/** Pure fetch of the schedule list (throws on non-2xx); no React state. */
async function fetchSchedules(signal?: AbortSignal): Promise<ScheduleDTO[]> {
  const res = await fetch("/api/schedules", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await readError(res));
  const body = (await res.json()) as SchedulesResponse;
  return body.items ?? [];
}

const loadErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Failed to load schedules";

export function ScheduledScreen() {
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form modal (create when `editing` is null, edit otherwise).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-row pending flags + delete confirmation.
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScheduleDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load on mount. The fetch + state writes live in an inline async IIFE so
  // every setState happens after `await` (never synchronously in the effect
  // body), and an AbortController cancels the in-flight request on unmount.
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const items = await fetchSchedules(controller.signal);
        setSchedules(items);
        setLoadError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(loadErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        setSchedules(await fetchSchedules());
        setLoadError(null);
      } catch (err) {
        setLoadError(loadErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (schedule: ScheduleDTO) => {
    setEditing(schedule);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: ScheduleFormPayload) => {
    setSubmitting(true);
    try {
      const isEdit = Boolean(editing);
      const res = await fetch(
        isEdit ? `/api/schedules/${editing!.id}` : "/api/schedules",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(await readError(res));
      const saved = (await res.json()) as ScheduleDTO;
      setSchedules((prev) =>
        isEdit
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [saved, ...prev],
      );
      setFormOpen(false);
      setEditing(null);
      toast({
        tone: "success",
        message: isEdit ? "Schedule updated" : "Schedule created",
      });
    } catch (err) {
      toast({
        tone: "error",
        message: err instanceof Error ? err.message : "Could not save schedule",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (schedule: ScheduleDTO, enabled: boolean) => {
    setTogglingId(schedule.id);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const saved = (await res.json()) as ScheduleDTO;
      setSchedules((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      toast({
        tone: "info",
        message: enabled ? "Schedule resumed" : "Schedule paused",
      });
    } catch (err) {
      toast({
        tone: "error",
        message: err instanceof Error ? err.message : "Could not update schedule",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRunNow = async (schedule: ScheduleDTO) => {
    setRunningId(schedule.id);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readError(res));
      const body = (await res.json()) as { schedule?: ScheduleDTO };
      if (body.schedule) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === body.schedule!.id ? body.schedule! : s)),
        );
      }
      toast({ tone: "success", message: "Generation started — it will appear in your library" });
    } catch (err) {
      toast({
        tone: "error",
        message: err instanceof Error ? err.message : "Could not run schedule",
      });
    } finally {
      setRunningId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      setSchedules((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      toast({ tone: "success", message: "Schedule deleted" });
      setPendingDelete(null);
    } catch (err) {
      toast({
        tone: "error",
        message: err instanceof Error ? err.message : "Could not delete schedule",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[27px] font-semibold tracking-[-0.02em] text-ink">
            Scheduled
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[15px] text-secondary">
            Automatically generate posts on a recurring cadence. Runs land in
            your library like any other post.
          </p>
        </div>
        <Button leftIcon={<PlusIcon size={16} />} onClick={openCreate}>
          New schedule
        </Button>
      </header>

      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={116} radius={16} />
            ))}
          </div>
        ) : loadError ? (
          <Card padded>
            <ErrorState
              title="Couldn't load schedules"
              description={loadError}
              action={
                <Button variant="secondary" onClick={retry}>
                  Try again
                </Button>
              }
            />
          </Card>
        ) : schedules.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CalendarIcon size={26} />}
              title="No schedules yet"
              description="Create a schedule to automatically generate posts on a recurring cadence — a fixed topic or a rotating trending theme."
              action={
                <Button leftIcon={<PlusIcon size={16} />} onClick={openCreate}>
                  New schedule
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                toggling={togglingId === schedule.id}
                running={runningId === schedule.id}
                onToggle={(enabled) => void handleToggle(schedule, enabled)}
                onRunNow={() => void handleRunNow(schedule)}
                onEdit={() => openEdit(schedule)}
                onDelete={() => setPendingDelete(schedule)}
              />
            ))}
          </div>
        )}
      </div>

      {formOpen ? (
        <ScheduleFormModal
          // Remount per open (keyed on the edited id) so fields hydrate fresh.
          key={editing?.id ?? "new"}
          open
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          initial={editing ?? undefined}
          submitting={submitting}
          onSubmit={(payload) => void handleSubmit(payload)}
        />
      ) : null}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete schedule?"
        description="This stops all future runs for this schedule. Posts it already generated stay in your library."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructiveSolid"
              loading={deleting}
              onClick={() => void confirmDelete()}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
