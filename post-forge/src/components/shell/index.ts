// PostForge app shell — the persistent frame + global states for authed routes.
// Consumed by src/app/(app)/** and by all authed screen tasks (T10–T15).
// Import from "@/components/shell" (kept out of the top-level barrel to avoid
// collisions with T09, which runs in parallel).
export * from "./nav-config";
export * from "./error-state";
export * from "./sidebar";
export * from "./topbar";
export * from "./app-shell";
