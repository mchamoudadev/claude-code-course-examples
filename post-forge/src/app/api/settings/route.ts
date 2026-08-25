/**
 * GET/PUT /api/settings — read/write the default `GenerationOptions` applied to
 * new posts (T15). The settings store allowlists only generation-defaults
 * fields; per the locked decision there are NO API-key fields here.
 */

import { z } from "zod";
import { getSettings, putSettings } from "@/lib/settings-repo";
import { errorBody, toSettingsDTO, type SettingsDTO } from "@/lib/dto";
import { resolvedTextModelDefaults } from "@/lib/models";
import { resolvedImageModelDefault } from "@/lib/image";

/** Env-resolved model defaults, so the UI can label the "Default" options. */
function resolvedDefaults(): SettingsDTO["defaults"] {
  const text = resolvedTextModelDefaults();
  return {
    textModelSmart: text.smart,
    textModelCheap: text.cheap,
    imageModel: resolvedImageModelDefault(),
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Partial generation defaults accepted by PUT (no key fields, ever). */
const settingsSchema = z.object({
  model: z.string().min(1).max(200).optional(),
  imageModel: z.string().min(1).max(200).optional(),
  tone: z.string().min(1).max(100).optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
});

export async function GET(): Promise<Response> {
  const settings = await getSettings();
  return Response.json({
    ...toSettingsDTO(settings),
    defaults: resolvedDefaults(),
  } satisfies SettingsDTO);
}

export async function PUT(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(errorBody("Invalid JSON body", "invalid_request"), {
      status: 400,
    });
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => {
        const path = i.path.join(".");
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join("; ");
    return Response.json(
      errorBody(message || "Invalid settings", "invalid_request"),
      { status: 400 },
    );
  }

  const updated = await putSettings(parsed.data);
  return Response.json(toSettingsDTO(updated));
}
