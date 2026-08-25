import type { Metadata } from "next";
import { AuthCard } from "../_components/auth-card";

export const metadata: Metadata = {
  title: "Sign in · PostForge",
  description: "Sign in to your PostForge workspace.",
};

export default function SignInPage() {
  return <AuthCard mode="signin" />;
}
