"use client";

import { cn, Input, Select, SearchIcon } from "@/components/ui";

/** Status buckets offered in the toolbar (in-progress spans the six live stages). */
export type StatusFilter = "all" | "done" | "in-progress" | "failed";
export type DateFilter = "all" | "7d" | "30d" | "90d";
export type LibraryView = "grid" | "list";

export interface FilterCounts {
  all: number;
  done: number;
  inProgress: number;
  failed: number;
}

const STATUS_TABS: { value: StatusFilter; label: string; countKey: keyof FilterCounts }[] = [
  { value: "all", label: "All", countKey: "all" },
  { value: "done", label: "Published", countKey: "done" },
  { value: "in-progress", label: "Generating", countKey: "inProgress" },
  { value: "failed", label: "Failed", countKey: "failed" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function GridGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export interface LibraryToolbarProps {
  query: string;
  onQuery: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  counts: FilterCounts;
  date: DateFilter;
  onDate: (value: DateFilter) => void;
  view: LibraryView;
  onView: (value: LibraryView) => void;
}

/** Search + status/date filters + grid/list toggle for the Library. */
export function LibraryToolbar({
  query,
  onQuery,
  status,
  onStatus,
  counts,
  date,
  onDate,
  view,
  onView,
}: LibraryToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] max-w-[340px] flex-1">
        <Input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search posts by topic or title"
          placeholder="Search by topic or title…"
          leftIcon={<SearchIcon size={16} />}
          className="h-10"
        />
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={active}
              onClick={() => onStatus(tab.value)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-lg border px-[13px] text-[13px] font-medium transition-colors",
                active
                  ? "border-primary bg-primary-50 text-primary-700"
                  : "border-border bg-surface text-body hover:bg-surface-sunken",
              )}
            >
              {tab.label}
              <span className={cn("text-[11px]", active ? "text-primary-600" : "text-muted")}>
                {counts[tab.countKey]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="w-[150px]">
          <Select
            value={date}
            onChange={(e) => onDate(e.target.value as DateFilter)}
            aria-label="Filter by date"
            className="h-10"
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div
          role="group"
          aria-label="View mode"
          className="flex gap-1 rounded-lg border border-border bg-surface p-1"
        >
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => onView("grid")}
            className={cn(
              "flex h-[30px] w-8 items-center justify-center rounded-md transition-colors",
              view === "grid"
                ? "bg-surface-sunken text-ink"
                : "text-muted hover:text-body",
            )}
          >
            <GridGlyph />
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onView("list")}
            className={cn(
              "flex h-[30px] w-8 items-center justify-center rounded-md transition-colors",
              view === "list"
                ? "bg-surface-sunken text-ink"
                : "text-muted hover:text-body",
            )}
          >
            <ListGlyph />
          </button>
        </div>
      </div>
    </div>
  );
}
