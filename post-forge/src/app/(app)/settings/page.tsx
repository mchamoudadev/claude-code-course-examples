import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings";

export const metadata: Metadata = {
  title: "Settings — PostForge",
  description:
    "Manage your account, verify integration connections, set generation defaults, and run maintenance actions.",
};

/**
 * Settings route (T15). A thin server component that mounts the client screen;
 * it renders inside the authed (app) shell + ToastProvider. Locked decision:
 * API keys are env-only — this screen shows integration status + test-connection
 * and never accepts key entry.
 */
export default function SettingsPage() {
  return <SettingsScreen />;
}
