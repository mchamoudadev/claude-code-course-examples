import type { Metadata } from "next";
import {
  CtaBand,
  FeatureRow,
  Features,
  Hero,
  LandingNav,
  SiteFooter,
  TrustBar,
  VerificationShowcase,
} from "@/components/landing";

const TITLE = "PostForge — One topic in. A researched, verified post out.";
const DESCRIPTION =
  "PostForge runs a team of autonomous AI agents that research the web, fact-check every claim, write the piece, design a poster, and publish it — while you watch, live.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "autonomous content",
    "AI agents",
    "fact-checked writing",
    "content generation",
    "AI research",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "PostForge",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip bg-bg">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Features />
        <VerificationShowcase />
        <FeatureRow />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
