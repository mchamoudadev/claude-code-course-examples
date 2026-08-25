"use client";

import Link from "next/link";
import type { PostDetail } from "@/lib/dto";
import { ArrowRightIcon, CheckIcon } from "@/components/ui";
import { formatDuration, overallElapsedMs } from "./helpers";

export interface DoneHandoffProps {
  post: PostDetail;
  /** Clock fallback for elapsed (terminal runs derive from server timestamps). */
  now: number;
}

/**
 * The done-state handoff. Deliberately MINIMAL: T11 owns the `posts/[id]` route
 * shell but the finished-article view is T12's job — it will replace this branch.
 * Until then this is a tasteful completion moment: the poster, the title, a
 * one-line recap and a clear CTA into the finished post.
 */
export function DoneHandoff({ post, now }: DoneHandoffProps) {
  const elapsed = formatDuration(overallElapsedMs(post, now));
  const sourceCount = post.sources.length;
  const verifiedCount = post.verifiedFindings.filter((f) => f.verified).length;
  const title = post.title ?? post.topic;

  return (
    <div className="mx-auto max-w-[720px] pt-2">
      <div
        className="overflow-hidden rounded-[20px] border border-primary-200 bg-[linear-gradient(120deg,#ecfdf5,#f5fdf9)] shadow-sm"
        style={{ animation: "pf-up 0.4s ease both" }}
      >
        <div className="flex flex-col gap-6 p-7 sm:flex-row sm:items-center">
          {/* Poster (real bytes if illustrated, else a brand gradient). */}
          <div className="w-full flex-none overflow-hidden rounded-[14px] border border-primary-200 sm:w-[220px]">
            {post.posterImageId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/posters/${post.posterImageId}`}
                alt="Generated poster"
                className="block aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div
                className="flex aspect-[16/10] w-full flex-col justify-between p-4"
                style={{ background: "linear-gradient(135deg,#064e3b 0%,#0d7d68 48%,#10b981 100%)" }}
                aria-hidden
              >
                <div className="font-mono text-[8px] tracking-[0.05em] text-primary-200">POSTFORGE</div>
                <div className="font-serif text-[15px] font-medium leading-tight text-white line-clamp-3">
                  {title}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary">
                <CheckIcon size={13} strokeWidth={3.5} className="text-white" />
              </span>
              <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-primary-700">
                Your post is ready
              </span>
            </div>

            <h1 className="mt-3 text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
              {title}
            </h1>

            <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#3e6b57]">
              Researched, fact-checked and illustrated in {elapsed}. {sourceCount} source
              {sourceCount === 1 ? "" : "s"} cited · {verifiedCount} claim
              {verifiedCount === 1 ? "" : "s"} verified.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href={`/posts/${post.id}`}
                className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] bg-primary px-[18px] text-[14px] font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
              >
                Read the post
                <ArrowRightIcon size={15} />
              </Link>
              <Link
                href="/new-post"
                className="inline-flex h-[42px] items-center justify-center rounded-[10px] border border-verified-border bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:bg-[#f5fdf9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Generate another
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/library"
          className="text-[13px] text-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          View all posts in your library
        </Link>
      </div>
    </div>
  );
}
