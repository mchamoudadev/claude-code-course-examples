/**
 * GET /api/posts — list posts newest-first with search / status / date filters
 * and offset pagination. Backs the dashboard library (T13).
 *
 * Query params:
 *   - `search`    case-insensitive substring match on topic
 *   - `status`    one of the PostStatus values (ignored if not a known status)
 *   - `from`,`to` ISO date bounds on createdAt (ignored if unparseable)
 *   - `page`      1-based page number (default 1)
 *   - `pageSize`  rows per page (default 20, clamped 1..100 by the repo)
 */

import { listPosts } from "@/lib/posts-repo";
import type { PostStatus } from "@/lib/state";
import {
  errorBody,
  toPostSummary,
  type PostListResponse,
} from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_STATUSES: ReadonlySet<PostStatus> = new Set<PostStatus>([
  "researching",
  "verifying",
  "writing",
  "editing",
  "illustrating",
  "publishing",
  "done",
  "failed",
]);

/** Parse a positive integer query param, falling back to `fallback`. */
function intParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Parse an ISO/parseable date, or undefined when absent/invalid. */
function dateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  const params = new URL(request.url).searchParams;

  const search = params.get("search")?.trim() || undefined;
  const statusRaw = params.get("status")?.trim();
  const status =
    statusRaw && KNOWN_STATUSES.has(statusRaw as PostStatus)
      ? (statusRaw as PostStatus)
      : undefined;
  const from = dateParam(params.get("from"));
  const to = dateParam(params.get("to"));
  const page = intParam(params.get("page"), 1);
  const pageSize = intParam(params.get("pageSize"), 20);

  const result = await listPosts({
    userId: user.id,
    search,
    status,
    from,
    to,
    page,
    pageSize,
  });

  const body: PostListResponse = {
    items: result.items.map(toPostSummary),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
  return Response.json(body);
}
