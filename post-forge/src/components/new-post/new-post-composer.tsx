"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OptionList } from "@/components/ui/option-list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import {
  AlertIcon,
  ArrowRightIcon,
  SlidersIcon,
} from "@/components/ui/icons";
import type {
  GenerateRequestOptions,
  GenerateResponse,
  GenerationLength,
  SettingsDefaults,
  SettingsDTO,
} from "@/lib/dto";
import {
  buildImageModelOptions,
  buildModelOptions,
  LENGTH_OPTIONS,
  SERVER_DEFAULT,
  SUGGESTED_TOPICS,
  TONE_OPTIONS,
  withInjected,
} from "./options";

/** Trimmed topic must be at least this long before generation is allowed. */
const MIN_TOPIC = 8;
/** Matches the server schema (`generateSchema.topic.max(500)`). */
const MAX_TOPIC = 500;

/**
 * T19's rate-limit / dedupe envelope. Defined locally (a structural check, not
 * an import) so this screen ships before T19 lands the canonical type in
 * `@/lib/dto`.
 */
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

function isGenerateResponse(v: unknown): v is GenerateResponse {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { id?: unknown }).id === "string"
  );
}

/** Pull a human message out of the standard `ApiError` envelope, if present. */
function apiErrorMessage(v: unknown): string | undefined {
  if (typeof v === "object" && v !== null && "error" in v) {
    const err = (v as { error?: { message?: unknown } }).error;
    if (err && typeof err.message === "string") return err.message;
  }
  return undefined;
}

function validateTopic(trimmed: string): string | null {
  if (!trimmed) return "Enter a topic to get started.";
  if (trimmed.length < MIN_TOPIC) {
    return `Give the agents a bit more to work with (at least ${MIN_TOPIC} characters).`;
  }
  return null;
}

/** Small heading above each advanced control (a styled, non-form label). */
function ControlLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-[9px] block text-[12.5px] font-medium text-body">{children}</span>
  );
}

export function NewPostComposer() {
  const router = useRouter();
  const { toast } = useToast();
  const errorId = useId();

  const [topic, setTopic] = useState("");
  const [model, setModel] = useState<string>(SERVER_DEFAULT);
  const [imageModel, setImageModel] = useState<string>(SERVER_DEFAULT);
  const [tone, setTone] = useState<string>("professional");
  const [length, setLength] = useState<GenerationLength>("medium");
  // Env-resolved model defaults, so the "Default" rows can show the real model.
  const [defaults, setDefaults] = useState<SettingsDefaults | undefined>(undefined);

  const [topicError, setTopicError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<{ reason: string; existingPostId?: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Prefill advanced options from the saved generation defaults. A failure here
  // is non-fatal — the built-in defaults simply stay in place.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const s = (await res.json()) as SettingsDTO;
        if (cancelled) return;
        if (s.model !== undefined) setModel(s.model);
        if (s.imageModel !== undefined) setImageModel(s.imageModel);
        if (s.tone !== undefined) setTone(s.tone);
        if (s.length !== undefined) setLength(s.length);
        if (s.defaults) setDefaults(s.defaults);
      } catch {
        // Ignore — prefill is a nicety, not a requirement.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the pickers with the resolved default tags, keeping any
  // persisted-but-uncurated slug selectable.
  const modelOptions = useMemo(
    () => withInjected(buildModelOptions(defaults), model),
    [defaults, model],
  );
  const imageOptions = useMemo(
    () => withInjected(buildImageModelOptions(defaults), imageModel),
    [defaults, imageModel],
  );

  function onTopicChange(value: string) {
    setTopic(value);
    if (topicError) setTopicError(null);
    if (blocked) setBlocked(null);
  }

  function pickSuggestion(t: string) {
    setTopic(t);
    setTopicError(null);
    setBlocked(null);
    textareaRef.current?.focus();
  }

  async function submit() {
    if (submitting) return;
    const trimmed = topic.trim();
    const err = validateTopic(trimmed);
    if (err) {
      setTopicError(err);
      textareaRef.current?.focus();
      return;
    }
    setTopicError(null);
    setBlocked(null);
    setSubmitting(true);

    const options: GenerateRequestOptions = { tone, length };
    if (model) options.model = model;
    if (imageModel) options.imageModel = imageModel;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, options }),
      });

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON body handled by the status checks below.
      }

      // Rate-limit / dedupe is handled structurally, regardless of status code.
      if (isBlocked(json)) {
        const reason = json.reason ?? "This topic was generated recently.";
        setBlocked({ reason, existingPostId: json.existingPostId });
        toast({ tone: "info", message: reason });
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        toast({
          tone: "error",
          message: apiErrorMessage(json) ?? "Couldn't start generation. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      if (isGenerateResponse(json)) {
        // Leave the button in its loading state while the route transition runs.
        router.push(`/posts/${json.id}`);
        return;
      }

      toast({ tone: "error", message: "Unexpected response from the server." });
      setSubmitting(false);
    } catch {
      toast({
        tone: "error",
        message: "Network error — check your connection and try again.",
      });
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit();
  }

  function onTopicKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter submits from within the textarea.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  const invalid = Boolean(topicError);

  return (
    <div className="mx-auto max-w-[720px] pt-2 md:pt-6">
      {/* Header */}
      <div className="mb-7 text-center">
        <div className="mb-[18px] inline-flex items-center gap-[7px] rounded-full border border-border bg-surface py-[5px] pl-2 pr-3 text-[12.5px] text-body">
          <span className="inline-flex items-center gap-[5px] rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
            <span className="h-[5px] w-[5px] rounded-full bg-primary" />
            6 agents
          </span>
          autonomous · sourced · illustrated
        </div>
        <h1 className="text-[clamp(28px,6vw,36px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
          What should we write about?
        </h1>
        <p className="mx-auto mt-3 max-w-[440px] text-[16px] text-secondary">
          Give the agents a topic. They&rsquo;ll research it, verify it and publish in about 20
          seconds.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        {/* Prompt */}
        <div
          className={cn(
            "rounded-[18px] border bg-surface p-2 shadow-[0_18px_44px_-24px_rgba(11,18,16,0.28)] transition-colors",
            invalid
              ? "border-error-strong"
              : "border-border focus-within:border-primary",
          )}
        >
          <textarea
            ref={textareaRef}
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            onKeyDown={onTopicKeyDown}
            maxLength={MAX_TOPIC}
            rows={3}
            placeholder="e.g. The rise of AI agents"
            aria-label="Post topic"
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className="block h-[88px] w-full resize-none bg-transparent px-[15px] pb-1 pt-3.5 text-[18px] leading-[1.4] text-ink outline-none placeholder:text-muted"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1.5">
            <span className="pl-1.5 text-[12px] text-muted">Be specific for sharper sources.</span>
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              rightIcon={<ArrowRightIcon size={16} />}
            >
              {submitting ? "Starting…" : "Generate post"}
            </Button>
          </div>
        </div>

        {/* Inline topic validation */}
        {topicError ? (
          <p
            id={errorId}
            role="alert"
            className="mt-[11px] flex items-center gap-2 pl-1 text-[13px] text-error-fg"
          >
            <AlertIcon size={15} className="shrink-0" />
            {topicError}
          </p>
        ) : null}

        {/* Dedupe / rate-limit notice (structural blocked response) */}
        {blocked ? (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-[13.5px] text-primary-700"
          >
            <AlertIcon size={16} className="mt-px shrink-0" />
            <div className="min-w-0">
              <p>{blocked.reason}</p>
              {blocked.existingPostId ? (
                <Link
                  href={`/posts/${blocked.existingPostId}`}
                  className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                >
                  View the existing post
                  <ArrowRightIcon size={13} />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Suggested topics */}
        <div className="mt-[18px] flex flex-wrap items-center justify-center gap-2">
          <span className="self-center text-[12.5px] text-muted">Try:</span>
          {SUGGESTED_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pickSuggestion(t)}
              className="rounded-full border border-border bg-surface px-[13px] py-1.5 text-[13px] text-body transition-colors hover:border-primary-200 hover:bg-primary-50/60"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Advanced controls */}
        <div className="mt-[34px] rounded-2xl border border-border bg-surface p-[22px]">
          <div className="mb-[18px] flex items-center gap-2">
            <SlidersIcon size={16} className="text-secondary" />
            <span className="text-[14px] font-semibold text-ink">Advanced</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <ControlLabel>
                Model <span className="font-normal text-muted">· OpenRouter</span>
              </ControlLabel>
              <OptionList
                mono
                aria-label="Text model"
                options={modelOptions}
                value={model}
                onChange={setModel}
              />
            </div>

            <div>
              <ControlLabel>Image model</ControlLabel>
              <OptionList
                aria-label="Image model"
                options={imageOptions}
                value={imageModel}
                onChange={setImageModel}
              />
            </div>

            <div>
              <ControlLabel>Length</ControlLabel>
              <SegmentedControl
                aria-label="Post length"
                options={LENGTH_OPTIONS}
                value={length}
                onChange={setLength}
              />
            </div>

            <div>
              <ControlLabel>Tone</ControlLabel>
              <SegmentedControl
                aria-label="Post tone"
                options={TONE_OPTIONS}
                value={tone}
                onChange={setTone}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
