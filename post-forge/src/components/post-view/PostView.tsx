"use client";

import Link from "next/link";
import type { PostDetail } from "@/lib/dto";
import { safeHttpUrl } from "@/lib/safe-url";
import { SourceCitationChip } from "@/components/sources";
import {
  ArrowLeftIcon,
  PencilIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { ArticleBody } from "./article-body";
import { PostActions } from "./post-actions";
import {
  DEFAULT_IMAGE_MODEL_LABEL,
  DEFAULT_MODEL_LABEL,
  domainOf,
  flaggedClaimCount,
  formatDate,
  formatDuration,
  formatTokens,
  generationMs,
  readingMinutes,
  sourceVerdicts,
  totalTokens,
  verdictFor,
  verifiedClaimCount,
  wordCount,
  yearOf,
} from "./helpers";

/**
 * The finished-article view (T12) — the `status === "done"` branch of the
 * shared `/posts/[id]` route (rendered by T11's PipelineView). Presents the
 * deliverable as a real article: fact-checked eyebrow, serif title + editorial
 * body, hero poster, a per-source verification section, generation metadata,
 * and the copy / download / regenerate / delete actions.
 */

/** Small mono metadata cell (LABEL over value). */
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.04em] text-faint">{label}</div>
      <div className="mt-[3px] text-[13px] text-body">{value}</div>
    </div>
  );
}

export function PostView({ post }: { post: PostDetail }) {
  const title = post.title ?? post.topic;
  const body = post.finalPost ?? post.draft ?? "";

  const words = wordCount(body);
  const verdicts = sourceVerdicts(post);
  const verified = verifiedClaimCount(post);
  const flagged = flaggedClaimCount(post);

  const modelLabel = post.options.model ?? DEFAULT_MODEL_LABEL;
  const imageModelLabel = post.options.imageModel ?? DEFAULT_IMAGE_MODEL_LABEL;
  const genTime = formatDuration(generationMs(post));
  const tokens = formatTokens(totalTokens(post));

  return (
    <article className="mx-auto max-w-[768px]">
      {/* Back to library */}
      <Link
        href="/library"
        className="mb-[22px] inline-flex items-center gap-1.5 text-[13.5px] text-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <ArrowLeftIcon size={15} />
        Library
      </Link>

      {/* Eyebrow: topic + fact-checked badge */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-primary-50 px-[11px] py-1 text-[12px] font-semibold text-primary-600">
          {post.topic}
        </span>
        {verified > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-verified-border bg-verified-tint px-2.5 py-[3px] text-[12px] font-semibold text-verified-fg">
            <ShieldCheckIcon size={12} strokeWidth={2.4} />
            Fact-checked
          </span>
        ) : null}
      </div>

      {/* Title (Newsreader serif) */}
      <h1 className="font-serif text-[clamp(30px,7vw,42px)] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
        {title}
      </h1>

      {/* Byline + actions */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-border-subtle pb-[22px]">
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}
            aria-hidden
          >
            <PencilIcon size={16} strokeWidth={1.9} />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-medium text-ink">
              Written by {modelLabel}
            </span>
            <span className="block font-mono text-[11.5px] text-muted">via OpenRouter</span>
          </span>
        </span>

        <span className="hidden h-[26px] w-px bg-border-subtle sm:block" aria-hidden />
        <span className="text-[13px] text-muted">{formatDate(post.createdAt)}</span>
        <span className="text-[13px] text-muted">· {readingMinutes(words)} min read</span>

        <PostActions post={post} />
      </div>

      {/* Hero poster */}
      <div className="my-[26px] overflow-hidden rounded-2xl shadow-xl">
        {post.posterImageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/posters/${post.posterImageId}`}
            alt={`Poster for “${title}”`}
            className="block aspect-[2/1] w-full object-cover"
          />
        ) : (
          <div
            className="relative flex aspect-[2/1] w-full flex-col justify-between p-[30px]"
            style={{
              background: "linear-gradient(135deg,#064e3b 0%,#0d7d68 48%,#10b981 100%)",
            }}
            aria-hidden
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(600px 300px at 78% 20%, rgba(255,255,255,.22), transparent)",
              }}
            />
            <div className="relative flex items-start justify-between font-mono text-[11px] tracking-[0.1em] text-white/75">
              <span>POSTFORGE · GENERATED</span>
              <span>{yearOf(post.createdAt)}</span>
            </div>
            <div className="relative max-w-[80%] font-serif text-[clamp(22px,5vw,34px)] font-medium leading-[1.08] tracking-[-0.01em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.2)]">
              {title}
            </div>
          </div>
        )}
      </div>

      {/* Editorial body */}
      <ArticleBody text={body} />

      {/* Verification summary */}
      {verified > 0 ? (
        <div className="my-[30px] flex items-center gap-3.5 rounded-2xl border border-verified-border bg-verified-tint px-[18px] py-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-primary text-white">
            <ShieldCheckIcon size={21} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-semibold text-[#0b4b37]">
              {flagged > 0 ? "Every claim was cross-checked" : "Every claim was fact-checked"}
            </div>
            <div className="mt-0.5 text-[13px] text-[#3e6b57]">
              {verified} claim{verified === 1 ? "" : "s"} verified against sources
              {flagged > 0
                ? ` · ${flagged} flagged and revised before publishing.`
                : "."}
            </div>
          </div>
        </div>
      ) : null}

      {/* Sources */}
      {post.sources.length > 0 ? (
        <section className="mt-[34px]">
          <div className="mb-3.5 flex items-center gap-2.5">
            <h2 className="text-[18px] font-semibold text-ink">Sources</h2>
            <span className="rounded-full bg-surface-sunken px-[9px] py-0.5 text-[12px] font-medium text-muted">
              {post.sources.length} cited
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {post.sources.map((s, i) => (
              <SourceCitationChip
                key={`${s.url}-${i}`}
                index={i + 1}
                title={s.title}
                domain={domainOf(s.url)}
                verified={verdictFor(verdicts, s.url) === "verified"}
                href={safeHttpUrl(s.url) ?? undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Generation metadata */}
      <div className="mt-[30px] flex flex-wrap gap-x-7 gap-y-3 border-t border-border-subtle pt-5 font-mono">
        <MetaCell label="Model" value={modelLabel} />
        {post.posterImageId ? <MetaCell label="Poster" value={imageModelLabel} /> : null}
        <MetaCell label="Gen time" value={genTime} />
        <MetaCell label="Words" value={String(words)} />
        <MetaCell label="Tokens" value={tokens} />
      </div>
    </article>
  );
}
