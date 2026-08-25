"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PostDetail } from "@/lib/dto";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertTriangleIcon,
  CopyIcon,
  DownloadIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { slugify, toMarkdown } from "./helpers";

/**
 * The article action bar (T12): Copy · Download poster · Regenerate · Delete.
 *
 * Regenerate semantics (decision, see report R-0025): a fresh run — POST
 * /api/generate with the SAME topic + the run's options. The generate route
 * owns doc creation, so this mints a NEW post doc and navigates to it. A T19
 * dedupe/rate-limit block (`{ blocked: true }`) is handled structurally (info
 * toast), never as a hard error. Delete removes the doc + its GridFS poster
 * then returns to the library.
 */

const actionBtn =
  "inline-flex items-center gap-1.5 h-[34px] px-3 rounded-[9px] border border-border bg-surface " +
  "text-[13px] font-medium text-body transition-colors hover:bg-surface-sunken " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 " +
  "disabled:opacity-55 disabled:cursor-not-allowed";

interface BlockedResponse {
  blocked: true;
  reason?: string;
  existingPostId?: string;
}

function isBlocked(v: unknown): v is BlockedResponse {
  return (
    typeof v === "object" &&
    v !== null &&
    "blocked" in v &&
    (v as { blocked?: unknown }).blocked === true
  );
}

function isGenerateResponse(v: unknown): v is { id: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { id?: unknown }).id === "string"
  );
}

function apiErrorMessage(v: unknown): string | undefined {
  if (typeof v === "object" && v !== null && "error" in v) {
    const err = (v as { error?: { message?: unknown } }).error;
    if (err && typeof err.message === "string") return err.message;
  }
  return undefined;
}

/** Best-effort clipboard write with a legacy `execCommand` fallback. */
async function writeClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

/** Pick a file extension from a poster blob's MIME type. */
function extFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "png";
}

export function PostActions({ post }: { post: PostDetail }) {
  const router = useRouter();
  const { toast } = useToast();

  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const title = post.title ?? post.topic;

  async function onCopy() {
    try {
      await writeClipboard(toMarkdown(post));
      toast({ tone: "success", message: "Post copied to clipboard" });
    } catch {
      toast({ tone: "error", message: "Couldn't copy the post" });
    }
  }

  async function onDownloadPoster() {
    if (!post.posterImageId || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/posters/${post.posterImageId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`poster fetch failed (${res.status})`);
      const blob = await res.blob();
      const ext = extFromMime(blob.type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(title)}-poster.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ tone: "success", message: "Poster downloaded" });
    } catch {
      toast({ tone: "error", message: "Couldn't download the poster" });
    } finally {
      setDownloading(false);
    }
  }

  async function onRegenerate() {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: post.topic, options: post.options }),
      });

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON — the status checks below take over.
      }

      // Rate-limit / dedupe is structural, independent of the status code.
      if (isBlocked(json)) {
        toast({
          tone: "info",
          message: json.reason ?? "This topic was generated recently.",
        });
        setRegenerating(false);
        return;
      }

      if (!res.ok) {
        toast({
          tone: "error",
          message: apiErrorMessage(json) ?? "Couldn't start a new run.",
        });
        setRegenerating(false);
        return;
      }

      if (isGenerateResponse(json)) {
        toast({ tone: "success", message: "Regenerating — a fresh run is starting" });
        // Keep the button in its loading state while the route transition runs.
        router.push(`/posts/${json.id}`);
        return;
      }

      toast({ tone: "error", message: "Unexpected response from the server." });
      setRegenerating(false);
    } catch {
      toast({ tone: "error", message: "Network error — please try again." });
      setRegenerating(false);
    }
  }

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast({
          tone: "error",
          message: apiErrorMessage(json) ?? "Couldn't delete this post.",
        });
        setDeleting(false);
        return;
      }
      toast({ tone: "success", message: "Post deleted" });
      // Leave the modal + loading state up while navigating away.
      router.push("/library");
    } catch {
      toast({ tone: "error", message: "Network error — please try again." });
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="ml-auto flex flex-wrap items-center gap-[7px]">
        <button type="button" onClick={onCopy} className={actionBtn}>
          <CopyIcon size={14} />
          Copy
        </button>

        {post.posterImageId ? (
          <button
            type="button"
            onClick={onDownloadPoster}
            disabled={downloading}
            className={actionBtn}
          >
            {downloading ? (
              <Spinner size={14} color="var(--color-primary-600)" />
            ) : (
              <DownloadIcon size={14} />
            )}
            Poster
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className={actionBtn}
        >
          {regenerating ? (
            <Spinner size={14} color="var(--color-primary-600)" />
          ) : (
            <RefreshIcon size={14} />
          )}
          Regenerate
        </button>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete post"
          title="Delete"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-border bg-surface text-error-fg transition-colors hover:border-error-border hover:bg-error-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error-strong"
        >
          <TrashIcon size={14} />
        </button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!deleting) setConfirmOpen(false);
        }}
        title="Delete this post?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructiveSolid" onClick={onDelete} loading={deleting}>
              Delete post
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-error-tint text-error-strong">
            <AlertTriangleIcon size={20} />
          </span>
          <p className="text-[14px] leading-relaxed text-body">
            <span className="font-medium text-ink">“{title}”</span> and its generated
            poster will be permanently removed from your library. This can&rsquo;t be
            undone.
          </p>
        </div>
      </Modal>
    </>
  );
}
