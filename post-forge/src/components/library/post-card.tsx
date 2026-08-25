import Link from "next/link";
import { Badge } from "@/components/ui";
import type { PostSummary } from "@/lib/dto";
import { PosterThumb } from "./poster-thumb";
import { statusMeta, relativeTime } from "./post-meta";

/** A single Library grid card — poster hero + title + status/date footer. */
export function PostCard({ post }: { post: PostSummary }) {
  const meta = statusMeta(post.status);
  const title = post.title ?? post.topic;

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <PosterThumb
        posterImageId={post.posterImageId}
        seed={post.id || post.topic}
        alt={`Poster for ${post.topic}`}
        className="flex h-[132px] items-end p-3.5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(300px_160px_at_80%_10%,rgba(255,255,255,0.2),transparent)]" />
        <span className="relative line-clamp-2 font-serif text-[15px] font-medium leading-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.3)]">
          {post.topic}
        </span>
      </PosterThumb>

      <div className="px-4 pb-4 pt-[15px]">
        <div className="mb-2.5 line-clamp-2 min-h-[38px] text-[14.5px] font-semibold leading-tight text-ink">
          {title}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge tone={meta.tone} dot={meta.active}>
            {meta.label}
          </Badge>
          <span className="font-mono text-[11.5px] text-faint">{relativeTime(post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
