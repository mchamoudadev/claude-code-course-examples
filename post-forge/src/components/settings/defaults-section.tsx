"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CheckIcon,
  Field,
  SegmentedControl,
  Select,
  useToast,
} from "@/components/ui";
import type { GenerationLength, SettingsDTO } from "@/lib/dto";
import { SettingsSection } from "./settings-section";
import {
  AUTO_MODEL,
  IMAGE_MODEL_OPTIONS,
  LENGTH_OPTIONS,
  TEXT_MODEL_OPTIONS,
  TONE_OPTIONS,
  withCurrent,
} from "./constants";

/** Local form shape — every field is concrete (AUTO_MODEL stands in for unset). */
interface DefaultsForm {
  model: string;
  imageModel: string;
  tone: string;
  length: GenerationLength;
}

/** Project a settings DTO into the always-concrete form state. */
function toForm(s: SettingsDTO): DefaultsForm {
  return {
    model: s.model ?? AUTO_MODEL,
    imageModel: s.imageModel ?? AUTO_MODEL,
    tone: s.tone ?? "professional",
    length: s.length ?? "medium",
  };
}

/** Build the PUT payload; AUTO_MODEL fields are omitted (defer to env tiers). */
function toPayload(form: DefaultsForm): SettingsDTO {
  const payload: SettingsDTO = { tone: form.tone, length: form.length };
  if (form.model !== AUTO_MODEL) payload.model = form.model;
  if (form.imageModel !== AUTO_MODEL) payload.imageModel = form.imageModel;
  return payload;
}

/**
 * Generation defaults — the model / image-model / tone / length applied to every
 * new post. Persisted via PUT /api/settings (T06) and consumed by the New Post
 * screen (T10). No API-key field lives here.
 */
export function DefaultsSection({
  initial,
  onSaved,
}: {
  initial: SettingsDTO;
  onSaved: (settings: SettingsDTO) => void;
}) {
  const { toast } = useToast();
  const [baseline, setBaseline] = useState<DefaultsForm>(() => toForm(initial));
  const [form, setForm] = useState<DefaultsForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      form.model !== baseline.model ||
      form.imageModel !== baseline.imageModel ||
      form.tone !== baseline.tone ||
      form.length !== baseline.length,
    [form, baseline],
  );

  const textOptions = withCurrent(TEXT_MODEL_OPTIONS, form.model);
  const imageOptions = withCurrent(IMAGE_MODEL_OPTIONS, form.imageModel);
  const toneOptions = withCurrent(TONE_OPTIONS, form.tone);

  function patch(next: Partial<DefaultsForm>) {
    setForm((prev) => ({ ...prev, ...next }));
    setJustSaved(false);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const data = (await res.json().catch(() => null)) as SettingsDTO | { error?: { message?: string } } | null;
      if (!res.ok) {
        const message =
          (data && "error" in data && data.error?.message) || `Save failed (HTTP ${res.status}).`;
        setError(message);
        toast({ tone: "error", message: "Could not save defaults" });
        return;
      }
      const saved = (data ?? {}) as SettingsDTO;
      const nextForm = toForm(saved);
      setBaseline(nextForm);
      setForm(nextForm);
      setJustSaved(true);
      onSaved(saved);
      toast({ tone: "success", message: "Generation defaults saved" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network request failed.";
      setError(message);
      toast({ tone: "error", message: "Could not save defaults" });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setForm(baseline);
    setJustSaved(false);
    setError(null);
  }

  return (
    <SettingsSection
      title="Generation defaults"
      description="These prefill every new post. You can still override them per-run on the New Post screen."
      aside={
        dirty ? (
          <Badge tone="warning" dot>
            Unsaved changes
          </Badge>
        ) : justSaved ? (
          <Badge tone="success">
            <span className="inline-flex items-center gap-1">
              <CheckIcon size={11} strokeWidth={3} />
              Saved
            </span>
          </Badge>
        ) : null
      }
    >
      <Card padded>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Default text model" hint="Routed through OpenRouter. Auto uses the env tier.">
            <Select
              aria-label="Default text model"
              value={form.model}
              onChange={(e) => patch({ model: e.target.value })}
            >
              {textOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Default image model" hint="Poster generation model on OpenRouter.">
            <Select
              aria-label="Default image model"
              value={form.imageModel}
              onChange={(e) => patch({ imageModel: e.target.value })}
            >
              {imageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Default tone">
            <Select
              aria-label="Default tone"
              value={form.tone}
              onChange={(e) => patch({ tone: e.target.value })}
            >
              {toneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Default length">
            <SegmentedControl<GenerationLength>
              aria-label="Default length"
              options={LENGTH_OPTIONS}
              value={form.length}
              onChange={(length) => patch({ length })}
            />
          </Field>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-error-border bg-error-tint px-3 py-2 text-[12.5px] text-error-fg"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border-subtle pt-5">
          <Button variant="ghost" size="md" onClick={reset} disabled={!dirty || saving}>
            Reset
          </Button>
          <Button size="md" onClick={save} loading={saving} disabled={!dirty && !saving}>
            Save changes
          </Button>
        </div>

        {justSaved ? (
          <p role="status" className="mt-3 text-right text-[12px] text-primary-600">
            Defaults saved — the New Post screen will prefill with them.
          </p>
        ) : null}
      </Card>
    </SettingsSection>
  );
}
