import type { Metadata } from "next";
import { PipelineView } from "@/components/pipeline-view";

/**
 * `/posts/[id]` — the route shell for a generation run. It owns status
 * branching for the whole lifecycle: T11 renders the live pipeline (in-progress
 * / failed) and a minimal done-state handoff; T12 will later expand the `done`
 * branch into the finished article inside `PipelineView`.
 *
 * Next 16: dynamic-route `params` is a Promise and must be awaited. The heavy
 * lifting (polling, live UI) lives in the client `PipelineView`.
 */

export const metadata: Metadata = {
  title: "Generating · PostForge",
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PipelineView id={id} />;
}
