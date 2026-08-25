import Link from "next/link";
import { Badge, ArrowRightIcon } from "@/components/ui";
import { PosterThumb } from "@/components/library/poster-thumb";
import { statusMeta, relativeTime } from "@/components/library/post-meta";
import type { PostSummary } from "@/lib/dto";

/** The "Recent posts" strip on the dashboard — newest posts, linking to detail. */
export function RecentPosts({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[14.5px] font-semibold text-ink">Recent posts</h3>
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-600 transition-colors hover:text-primary-700"
        >
          View all <ArrowRightIcon size={13} />
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">No posts yet.</p>
      ) : (
        <ul>
          {posts.map((post) => {
            const meta = statusMeta(post.status);
            const title = post.title ?? post.topic;
            return (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  className="flex items-center gap-3.5 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
                >
                  <PosterThumb
                    posterImageId={post.posterImageId}
                    seed={post.id || post.topic}
                    alt={`Poster for ${post.topic}`}
                    className="h-11 w-11 shrink-0 rounded-[9px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-ink">{title}</div>
                    <div className="mt-0.5 truncate text-[12px] text-muted">
                      {post.topic} · {relativeTime(post.createdAt)}
                    </div>
                  </div>
                  <Badge tone={meta.tone} dot={meta.active} className="shrink-0">
                    {meta.label}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
