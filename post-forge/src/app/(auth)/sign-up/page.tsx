import type { Metadata } from "next";
import { AuthCard } from "../_components/auth-card";

export const metadata: Metadata = {
  title: "Create your account · PostForge",
  description: "Start free — generate researched, verified posts with PostForge's agent pipeline.",
};

export default function SignUpPage() {
  return <AuthCard mode="signup" />;
}
