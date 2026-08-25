import Link from "next/link";
import { Badge } from "@/components/ui";
import type { PostSummary } from "@/lib/dto";
import { PosterThumb } from "./poster-thumb";
import { statusMeta, statusLabel, formatDate } from "./post-meta";

/** A single Library list row — compact thumb + title/topic + date + status. */
export function PostRow({ post }: { post: PostSummary }) {
  const meta = statusMeta(post.status);
  const primary = post.title ?? post.topic;
  const secondary = post.title ? post.topic : statusLabel(post.status);

  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex items-center gap-4 border-b border-divider px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
    >
      <PosterThumb
        posterImageId={post.posterImageId}
        seed={post.id || post.topic}
        alt={`Poster for ${post.topic}`}
        className="h-11 w-[60px] shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-ink">{primary}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-muted">{secondary}</div>
      </div>
      <span className="hidden w-[90px] shrink-0 text-right font-mono text-[12.5px] text-muted sm:block">
        {formatDate(post.createdAt)}
      </span>
      <div className="w-[92px] shrink-0 text-right">
        <Badge tone={meta.tone} dot={meta.active}>
          {meta.label}
        </Badge>
      </div>
    </Link>
  );
}
