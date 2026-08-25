"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, EmptyState, SearchIcon, PlusIcon } from "@/components/ui";
import { ErrorState } from "@/components/shell";
import type { PostListResponse, PostStatus, PostSummary } from "@/lib/dto";
import {
  LibraryToolbar,
  type StatusFilter,
  type DateFilter,
  type LibraryView,
  type FilterCounts,
} from "./library-toolbar";
import { PostCard } from "./post-card";
import { PostRow } from "./post-row";
import { LibrarySkeleton } from "./library-skeleton";

/** Results are fetched in one window and bucketed/paginated client-side. */
const FETCH_WINDOW = 60;
const PAGE_SIZE = 12;
const MS_DAY = 86_400_000;

/** Collapse a fine-grained post status into a toolbar bucket. */
function bucketOf(status: PostStatus): Exclude<StatusFilter, "all"> {
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  return "in-progress";
}

/** ISO lower-bound for a date-range preset (undefined = all time). */
function fromForDate(date: DateFilter): string | undefined {
  if (date === "all") return undefined;
  const days = date === "7d" ? 7 : date === "30d" ? 30 : 90;
  return new Date(Date.now() - days * MS_DAY).toISOString();
}

export function LibraryClient() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [date, setDate] = useState<DateFilter>("all");
  const [view, setView] = useState<LibraryView>("grid");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [items, setItems] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Sync from a topbar search that pushes /library?q=… while already mounted.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Debounce the search box before it hits the API.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to the first page whenever the effective result set changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, date, status]);

  // Fetch the search/date window from the API.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    const search = debouncedQuery.trim();
    if (search) params.set("search", search);
    const from = fromForDate(date);
    if (from) params.set("from", from);
    params.set("page", "1");
    params.set("pageSize", String(FETCH_WINDOW));

    fetch(`/api/posts?${params.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`posts ${r.status}`);
        return r.json() as Promise<PostListResponse>;
      })
      .then((data) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, date, reloadKey]);

  const counts: FilterCounts = useMemo(() => {
    const c: FilterCounts = { all: items.length, done: 0, inProgress: 0, failed: 0 };
    for (const it of items) {
      const b = bucketOf(it.status);
      if (b === "done") c.done += 1;
      else if (b === "failed") c.failed += 1;
      else c.inProgress += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(
    () => (status === "all" ? items : items.filter((it) => bucketOf(it.status) === status)),
    [items, status],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filtersActive = debouncedQuery.trim() !== "" || date !== "all" || status !== "all";
  const clearFilters = () => {
    setQuery("");
    setDate("all");
    setStatus("all");
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[27px] font-semibold tracking-[-0.025em] text-ink">Library</h1>
          <p className="mt-1.5 text-[15px] text-secondary">
            Every post your agents have produced.
          </p>
        </div>
        <Link
          href="/new-post"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(5,150,105,0.4)] transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
        >
          <PlusIcon size={16} /> New Post
        </Link>
      </div>

      <LibraryToolbar
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        counts={counts}
        date={date}
        onDate={setDate}
        view={view}
        onView={setView}
      />

      {loading ? (
        <LibrarySkeleton view={view} />
      ) : error ? (
        <div className="rounded-2xl border border-border bg-surface">
          <ErrorState
            title="Couldn’t load your library"
            description="Something went wrong fetching your posts. Please try again."
            action={<Button onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>}
          />
        </div>
      ) : filtered.length === 0 ? (
        filtersActive || items.length > 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface">
            <EmptyState
              icon={<SearchIcon size={24} />}
              title="No posts match your search"
              description="Try a different topic or clear your filters."
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface">
            <EmptyState
              icon={<PlusIcon size={24} />}
              title="No posts yet"
              description="Your agents haven’t written anything yet. Start your first post and it’ll appear here."
              action={
                <Link
                  href="/new-post"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(5,150,105,0.4)] transition-colors hover:bg-primary-700"
                >
                  <PlusIcon size={16} /> New Post
                </Link>
              }
            />
          </div>
        )
      ) : (
        <>
          {view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              {pageItems.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          )}

          {pageCount > 1 ? (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-[13px] text-muted">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-1 text-[13px] tabular-nums text-secondary">
                  Page {safePage} of {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
