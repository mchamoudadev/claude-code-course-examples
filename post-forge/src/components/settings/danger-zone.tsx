"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  Button,
  Field,
  Input,
  Modal,
  TrashIcon,
  useToast,
} from "@/components/ui";
import type { PostListResponse } from "@/lib/dto";
import { SettingsSection } from "./settings-section";

/** Word the user must type to arm the destructive action. */
const CONFIRM_WORD = "DELETE";

/**
 * Delete every post + its poster, page by page, through the existing
 * DELETE /api/posts/[id] endpoint (no bulk route is added — this task's surface
 * is settings-only). Returns how many posts were removed.
 */
async function deleteAllPosts(): Promise<number> {
  let deleted = 0;
  for (let guard = 0; guard < 400; guard++) {
    const res = await fetch("/api/posts?page=1&pageSize=50", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not list posts (HTTP ${res.status}).`);
    const data = (await res.json()) as PostListResponse;
    const items = data.items ?? [];
    if (items.length === 0) break;

    let progressed = 0;
    for (const item of items) {
      const del = await fetch(`/api/posts/${item.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (del.ok || del.status === 404) progressed++;
      if (del.ok) deleted++;
    }
    if (progressed === 0) {
      throw new Error("Deletion stalled — some posts could not be removed.");
    }
  }
  return deleted;
}

/**
 * Danger zone — irreversible actions gated behind an explicit type-to-confirm
 * dialog. The dialog's confirm text is a plain safety field, not a credential
 * (there are no key-entry fields anywhere on this screen).
 */
export function DangerZone() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const armed = confirm.trim().toUpperCase() === CONFIRM_WORD;

  function close() {
    if (deleting) return;
    setOpen(false);
    setConfirm("");
  }

  async function onConfirm() {
    if (!armed || deleting) return;
    setDeleting(true);
    try {
      const count = await deleteAllPosts();
      toast({
        tone: "success",
        message:
          count === 0
            ? "No posts to delete — the library is already empty."
            : `Deleted ${count} post${count === 1 ? "" : "s"}.`,
      });
      setOpen(false);
      setConfirm("");
    } catch (err) {
      toast({
        tone: "error",
        message: err instanceof Error ? err.message : "Failed to delete posts.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSection
      title="Danger zone"
      description="Irreversible, destructive actions. Proceed with care."
      icon={<AlertTriangleIcon size={18} />}
    >
      <div className="rounded-2xl border border-error-border bg-error-tint/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-ink">Delete all posts</h3>
            <p className="mt-1 max-w-[440px] text-[13px] text-secondary">
              Permanently removes every generated post and its poster image from the database. This
              cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="md"
            leftIcon={<TrashIcon size={15} />}
            onClick={() => setOpen(true)}
            className="shrink-0"
          >
            Delete all posts…
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={close}
        title="Delete all posts?"
        description="Every post and poster will be permanently removed. This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructiveSolid"
              onClick={onConfirm}
              disabled={!armed}
              loading={deleting}
              leftIcon={deleting ? undefined : <TrashIcon size={15} />}
            >
              Delete all posts
            </Button>
          </>
        }
      >
        <Field
          label={
            <>
              Type <span className="font-mono font-semibold text-ink">{CONFIRM_WORD}</span> to confirm
            </>
          }
          htmlFor="danger-confirm"
          hint="This safeguards against accidental deletion."
        >
          <Input
            id="danger-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
            aria-label={`Type ${CONFIRM_WORD} to confirm deletion`}
          />
        </Field>
      </Modal>
    </SettingsSection>
  );
}
