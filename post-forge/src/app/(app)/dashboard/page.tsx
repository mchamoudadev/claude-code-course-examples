import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard · PostForge",
  description: "Your PostForge overview — recent posts and pipeline analytics.",
};

/** Dashboard home. Data (stats + recent posts) is fetched client-side so the
 *  screen can show skeletons while loading and a first-run empty state. */
export default function DashboardPage() {
  return <DashboardClient />;
}
