import type { Metadata } from "next";
import { NewPostComposer } from "@/components/new-post";

export const metadata: Metadata = {
  title: "New Post · PostForge",
  description: "Give six autonomous agents a topic to research, verify, write and illustrate.",
};

/**
 * /new-post — the hero topic composer + generation trigger (T10). A thin server
 * page that mounts the interactive client composer inside the (app) shell.
 */
export default function NewPostPage() {
  return <NewPostComposer />;
}
