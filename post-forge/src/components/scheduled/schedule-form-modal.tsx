"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import type { GenerationLength, GenerationOptions } from "@/lib/dto";
import type { ScheduleDTO, SchedulePreset } from "@/lib/schedules-repo";
import {
  PRESET_OPTIONS,
  THEME_SOURCE_OPTIONS,
  TIMEZONE_OPTIONS,
  localTimezone,
} from "./cadence";

/** The create/update payload the screen sends to the API. */
export interface ScheduleFormPayload {
  topic?: string;
  themeSource?: string;
  cadence: { preset: SchedulePreset; cron?: string };
  timezone: string;
  options?: GenerationOptions;
  enabled: boolean;
}

type SourceType = "topic" | "theme";

export interface ScheduleFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present → edit mode; absent → create mode. */
  initial?: ScheduleDTO;
  submitting?: boolean;
  onSubmit: (payload: ScheduleFormPayload) => void;
}

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "topic", label: "Fixed topic" },
  { value: "theme", label: "Trending theme" },
];

const LENGTH_OPTIONS: { value: GenerationLength | ""; label: string }[] = [
  { value: "", label: "Default" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export function ScheduleFormModal({
  open,
  onClose,
  initial,
  submitting = false,
  onSubmit,
}: ScheduleFormModalProps) {
  // The parent mounts this modal fresh per open (keyed on the schedule id), so
  // the fields hydrate once from `initial` via lazy initializers — no effect.
  const initialIsTheme = Boolean(initial && !initial.topic && initial.themeSource);
  const [sourceType, setSourceType] = useState<SourceType>(
    initialIsTheme ? "theme" : "topic",
  );
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [themeSource, setThemeSource] = useState(
    initial?.themeSource ?? THEME_SOURCE_OPTIONS[0].value,
  );
  const [preset, setPreset] = useState<SchedulePreset>(
    initial?.cadence.preset ?? "daily",
  );
  const [cron, setCron] = useState(initial?.cadence.cron ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone || localTimezone());
  const [length, setLength] = useState<GenerationLength | "">(
    initial?.options?.length ?? "",
  );
  const [tone, setTone] = useState(initial?.options?.tone ?? "");
  const [model, setModel] = useState(initial?.options?.model ?? "");
  const [imageModel, setImageModel] = useState(initial?.options?.imageModel ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (sourceType === "topic" && topic.trim() === "") {
      setError("Enter a topic to generate.");
      return;
    }

    const options: GenerationOptions = {};
    if (length) options.length = length;
    if (tone.trim()) options.tone = tone.trim();
    if (model.trim()) options.model = model.trim();
    if (imageModel.trim()) options.imageModel = imageModel.trim();

    const payload: ScheduleFormPayload = {
      cadence: cron.trim()
        ? { preset, cron: cron.trim() }
        : { preset },
      timezone: timezone || "UTC",
      enabled,
    };
    if (sourceType === "topic") payload.topic = topic.trim();
    else payload.themeSource = themeSource;
    if (Object.keys(options).length > 0) payload.options = options;

    onSubmit(payload);
  };

  const isEdit = Boolean(initial);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit schedule" : "New schedule"}
      description={
        isEdit
          ? "Update this recurring post rule."
          : "Automatically generate a post on a recurring cadence."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? "Save changes" : "Create schedule"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Source">
          <SegmentedControl
            aria-label="Content source"
            options={SOURCE_OPTIONS}
            value={sourceType}
            onChange={setSourceType}
          />
        </Field>

        {sourceType === "topic" ? (
          <Field
            label="Topic"
            required
            error={error ?? undefined}
            hint="The subject each scheduled post is generated about."
          >
            <Textarea
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. This week in AI research"
              invalid={Boolean(error)}
              className="min-h-[64px]"
            />
          </Field>
        ) : (
          <Field
            label="Trending theme"
            hint="Each run auto-picks a fresh topic from this theme."
          >
            <Select
              value={themeSource}
              onChange={(e) => setThemeSource(e.target.value)}
            >
              {THEME_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Frequency">
          <SegmentedControl
            aria-label="Frequency"
            options={PRESET_OPTIONS}
            value={preset}
            onChange={setPreset}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Timezone">
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
              {timezone && !TIMEZONE_OPTIONS.includes(timezone) ? (
                <option value={timezone}>{timezone}</option>
              ) : null}
            </Select>
          </Field>
          <Field
            label="Custom cron (optional)"
            hint="5-field cron overrides the preset."
          >
            <Input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * 1"
              className="font-mono"
            />
          </Field>
        </div>

        <Field label="Status">
          <label className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onChange={setEnabled}
              aria-label="Schedule active"
            />
            <span className="text-[13px] text-body">
              {enabled ? "Active — runs on its cadence" : "Paused — won't run"}
            </span>
          </label>
        </Field>

        <details className="group rounded-xl border border-border bg-surface-sunken/40">
          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-body">
            Advanced generation options
          </summary>
          <div className="flex flex-col gap-4 border-t border-border-subtle p-4">
            <Field label="Length">
              <Select
                value={length}
                onChange={(e) =>
                  setLength(e.target.value as GenerationLength | "")
                }
              >
                {LENGTH_OPTIONS.map((o) => (
                  <option key={o.value || "default"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tone" hint="e.g. informative, punchy, analytical">
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Default tone"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Text model">
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Default (env)"
                  className="font-mono text-[12.5px]"
                />
              </Field>
              <Field label="Image model">
                <Input
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  placeholder="Default (env)"
                  className="font-mono text-[12.5px]"
                />
              </Field>
            </div>
          </div>
        </details>
      </div>
    </Modal>
  );
}
