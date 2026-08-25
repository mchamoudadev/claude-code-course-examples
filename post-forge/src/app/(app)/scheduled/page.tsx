import { ScheduledScreen } from "@/components/scheduled/scheduled-screen";

/**
 * Scheduled / cron management (T14). Lists recurring auto-post schedules with
 * create/edit, enable/disable, run-now, and an empty state. Mounts inside the
 * app shell provided by `(app)/layout.tsx`.
 */
export default function ScheduledPage() {
  return <ScheduledScreen />;
}
