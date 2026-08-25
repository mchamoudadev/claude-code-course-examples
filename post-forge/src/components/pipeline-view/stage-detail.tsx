"use client";

import { useState, type ReactNode } from "react";
import type { PostDetail, Stage } from "@/lib/dto";
import { safeHttpUrl } from "@/lib/safe-url";
import { AGENT_MAP } from "@/components/pipeline";
import { SourceCitationChip } from "@/components/sources";
import { CheckIcon, Spinner, XIcon, cn } from "@/components/ui";
import {
  approxWords,
  domainOf,
  editSub,
  excerpt,
  posterSub,
  researchSub,
  savedSub,
  verifySub,
  writeSub,
} from "./helpers";

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-faint">
      {children}
    </div>
  );
}

/** Shimmering "agent is working" row — the reveal-on-update placeholder. */
function WorkingRow({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
      style={{
        background: "linear-gradient(90deg,#f4f6f5,#edf0ef,#f4f6f5)",
        backgroundSize: "600px 100%",
        animation: "pf-shimmer 1.3s linear infinite",
      }}
    >
      <Spinner size={11} color={color} />
      <span className="text-[12.5px] text-muted">{label}</span>
    </div>
  );
}

/** Serif partial-text reveal with a blinking caret while the stage is active. */
function ProseReveal({ text, active, color }: { text: string; active: boolean; color: string }) {
  return (
    <div className="font-serif text-[16.5px] leading-[1.65] text-article">
      {text}
      {active ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[16px] w-0.5 align-[-2px]"
          style={{ background: color, animation: "pf-blink 1s step-end infinite" }}
        />
      ) : null}
    </div>
  );
}

function CheckRow({ color, tint, children }: { color: string; tint: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px] text-body" style={{ animation: "pf-up 0.3s ease both" }}>
      <span
        className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full"
        style={{ background: tint, color }}
      >
        <CheckIcon size={11} strokeWidth={3} />
      </span>
      {children}
    </div>
  );
}

/** Poster preview that fades + un-blurs on load (the "render-in" moment). */
function PosterPreview({ posterImageId }: { posterImageId: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="w-[200px] flex-none overflow-hidden rounded-[12px] border border-border-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/posters/${posterImageId}`}
          alt="Generated poster"
          onLoad={() => setLoaded(true)}
          className="block aspect-[16/10] w-full object-cover transition-[filter,opacity] duration-500"
          style={{ filter: loaded ? "none" : "blur(12px)", opacity: loaded ? 1 : 0.5 }}
        />
      </div>
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-agent-illustrate">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-agent-illustrate-tint">
            <CheckIcon size={11} strokeWidth={3} />
          </span>
          Poster ready
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          An original cover rendered from the post&rsquo;s themes and title.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-stage panels                                                            */
/* -------------------------------------------------------------------------- */

function ResearchDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const r = researchSub(post);
  const sources = r?.sources ?? [];
  return (
    <div>
      <SectionLabel>{r ? `${r.count} sources found` : "Sources found"}</SectionLabel>
      <div className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <SourceCitationChip
            key={`${s.url}-${i}`}
            index={i + 1}
            title={s.title}
            domain={domainOf(s.url)}
            href={safeHttpUrl(s.url) ?? undefined}
            variant="row"
          />
        ))}
        {active ? <WorkingRow color="#2563eb" label="Searching the web…" /> : null}
        {!active && sources.length === 0 ? (
          <p className="text-[13px] text-muted">No sources were recorded.</p>
        ) : null}
      </div>
    </div>
  );
}

function VerifyDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const v = verifySub(post);
  const claims = v?.claims ?? [];
  return (
    <div>
      <SectionLabel>
        {v ? `${claims.filter((c) => c.verified).length}/${v.count} claims verified` : "Claims checked"}
      </SectionLabel>
      <div className="flex flex-col gap-2">
        {claims.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-[10px] border border-border-subtle bg-surface px-3 py-2.5"
            style={{ animation: "pf-up 0.3s ease both" }}
          >
            <span
              className={cn(
                "mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full",
                c.verified ? "bg-success-tint text-success" : "bg-error-tint text-error-strong",
              )}
            >
              {c.verified ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={11} strokeWidth={3} />}
            </span>
            <span className="min-w-0 text-[13.5px] leading-snug text-body">{c.claim}</span>
          </div>
        ))}
        {active ? <WorkingRow color="#059669" label="Fact-checking claims against sources…" /> : null}
        {!active && claims.length === 0 ? (
          <p className="text-[13px] text-muted">No claims were recorded.</p>
        ) : null}
      </div>
    </div>
  );
}

function WriteDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const w = writeSub(post);
  const draft = post.draft?.trim();
  if (draft) return <ProseReveal text={excerpt(draft)} active={active} color={AGENT_MAP.write.color} />;
  if (active) {
    return (
      <div className="flex flex-col gap-2.5">
        <WorkingRow color="#7c3aed" label="Drafting the post from verified findings…" />
        {w && w.chars > 0 ? (
          <p className="font-mono text-[11.5px] text-faint">
            {w.chars.toLocaleString()} characters · ~{approxWords(w.chars).toLocaleString()} words so far
          </p>
        ) : null}
      </div>
    );
  }
  return <p className="text-[13px] text-muted">Draft complete.</p>;
}

function EditDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const e = editSub(post);
  const finalText = post.finalPost?.trim();
  const title = e?.title || post.title;
  return (
    <div className="flex flex-col gap-2.5">
      {title ? <div className="text-[16px] font-semibold leading-snug text-ink">{title}</div> : null}
      {finalText ? (
        <ProseReveal text={excerpt(finalText)} active={active} color={AGENT_MAP.edit.color} />
      ) : active ? (
        <WorkingRow color="#d97706" label="Polishing tone, structure and headline…" />
      ) : (
        <p className="text-[13px] text-muted">Edit complete.</p>
      )}
    </div>
  );
}

function IllustrateDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const p = posterSub(post);
  const posterImageId = p?.posterImageId ?? post.posterImageId;
  if (posterImageId) return <PosterPreview posterImageId={posterImageId} />;
  if (active) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="aspect-[16/10] w-[200px] flex-none overflow-hidden rounded-[12px]"
          style={{
            background: "linear-gradient(135deg,#831843,#db2777,#f472b6)",
            filter: "blur(2px)",
            opacity: 0.6,
          }}
          aria-hidden
        />
        <div className="min-w-0">
          <WorkingRow color="#db2777" label="Rendering an original cover…" />
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Composing a poster from the post&rsquo;s themes and title.
          </p>
        </div>
      </div>
    );
  }
  return <p className="text-[13px] text-muted">No poster was generated.</p>;
}

function PublishDetail({ post, active }: { post: PostDetail; active: boolean }) {
  const saved = savedSub(post);
  if (saved) {
    return (
      <div className="flex flex-col gap-2">
        <CheckRow color="#4f46e5" tint="#eef2ff">
          Saved the finished post to your library
        </CheckRow>
        <CheckRow color="#4f46e5" tint="#eef2ff">
          Stored the poster and citations
        </CheckRow>
        <CheckRow color="#4f46e5" tint="#eef2ff">
          Ready to read
        </CheckRow>
      </div>
    );
  }
  if (active) return <WorkingRow color="#4f46e5" label="Saving to your library…" />;
  return <p className="text-[13px] text-muted">Not yet published.</p>;
}

/* -------------------------------------------------------------------------- */
/* Dispatcher                                                                  */
/* -------------------------------------------------------------------------- */

export function StageDetail({
  stage,
  post,
  active,
}: {
  stage: Stage;
  post: PostDetail;
  active: boolean;
}) {
  switch (stage) {
    case "research":
      return <ResearchDetail post={post} active={active} />;
    case "verify":
      return <VerifyDetail post={post} active={active} />;
    case "write":
      return <WriteDetail post={post} active={active} />;
    case "edit":
      return <EditDetail post={post} active={active} />;
    case "illustrate":
      return <IllustrateDetail post={post} active={active} />;
    case "publish":
      return <PublishDetail post={post} active={active} />;
  }
}
