"use client";

import { useState } from "react";
import {
  AgentTimelineNode,
  AGENTS,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  LibraryIcon,
  Logo,
  Modal,
  NavItem,
  OptionList,
  PipelineStepper,
  ProgressBar,
  SearchIcon,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonText,
  SourceCitationChip,
  StageCard,
  StatCard,
  Switch,
  Tabs,
  Textarea,
  Tooltip,
  ToastProvider,
  useToast,
  DashboardIcon,
  PlusIcon,
  ArrowRightIcon,
  type AgentId,
  type AgentState,
} from "@/components";

/* ---------------- layout helpers ---------------- */

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3.5 font-mono text-xs font-semibold uppercase tracking-[0.09em] text-faint">
        {n} — {title}
      </div>
      <Card padded className="flex flex-col gap-6">
        {children}
      </Card>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[13.5px] font-semibold text-ink">{label}</div>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}

function Swatch({ name, value, dark }: { name: string; value: string; dark?: boolean }) {
  return (
    <div className="min-w-[92px]">
      <div
        className="h-14 rounded-[10px] border border-border-subtle"
        style={{ background: value }}
      />
      <div className="mt-1.5 text-[11px] text-body">{name}</div>
      <div className={`font-mono text-[10.5px] ${dark ? "text-secondary" : "text-faint"}`}>
        {value}
      </div>
    </div>
  );
}

/* ---------------- interactive demos ---------------- */

function PipelineDemo() {
  // A representative live snapshot: research/verify done, write active, rest queued.
  const [activeIndex, setActiveIndex] = useState(2);
  const states: Partial<Record<AgentId, AgentState>> = {};
  const progress: Partial<Record<AgentId, number>> = {};
  const sublabels: Partial<Record<AgentId, string>> = {};
  AGENTS.forEach((a, i) => {
    if (i < activeIndex) {
      states[a.id] = "done";
      sublabels[a.id] = `${(2 + i * 1.4).toFixed(1)}s`;
    } else if (i === activeIndex) {
      states[a.id] = "active";
      progress[a.id] = 62;
      sublabels[a.id] = "live";
    } else {
      states[a.id] = "queued";
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <PipelineStepper states={states} progress={progress} sublabels={sublabels} />
      <div className="flex items-center gap-2.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActiveIndex((i) => (i + 1) % (AGENTS.length + 1))}
        >
          Advance stage
        </Button>
        <span className="text-[12.5px] text-muted">
          Cycles the active stage so every state (queued / active / done) is visible.
        </span>
      </div>
    </div>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <Row label="Toasts">
      <Button size="sm" onClick={() => toast({ tone: "success", message: "Post published to your library" })}>
        Success toast
      </Button>
      <Button size="sm" variant="secondary" onClick={() => toast({ tone: "info", message: "Generation started" })}>
        Info toast
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => toast({ tone: "error", message: "The Verify agent hit an error" })}
      >
        Error toast
      </Button>
    </Row>
  );
}

function FormDemo() {
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState("gpt-5.5");
  const [length, setLength] = useState("standard");
  const [scheduled, setScheduled] = useState(true);
  const [invalid, setInvalid] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Field label="Topic" htmlFor="ds-topic" hint="Be specific for sharper sources.">
        <Input
          id="ds-topic"
          placeholder="e.g. Humanoid robots in 2026"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </Field>
      <Field label="Search" htmlFor="ds-search">
        <Input id="ds-search" placeholder="Search posts, topics…" leftIcon={<SearchIcon size={16} />} />
      </Field>
      <Field
        label="Topic (invalid state)"
        htmlFor="ds-invalid"
        error={invalid ? "Please enter a topic with at least 3 characters." : undefined}
      >
        <Input
          id="ds-invalid"
          invalid={invalid}
          placeholder="Type to toggle validity…"
          onChange={(e) => setInvalid(e.target.value.length > 0 && e.target.value.length < 3)}
        />
      </Field>
      <Field label="Image provider" htmlFor="ds-select">
        <Select id="ds-select" defaultValue="nano">
          <option value="nano">Nano Banana</option>
          <option value="gpt">GPT Image</option>
        </Select>
      </Field>
      <Field label="Prompt (textarea)" htmlFor="ds-textarea" className="md:col-span-2">
        <Textarea id="ds-textarea" placeholder="The rise of AI agents…" />
      </Field>
      <Field label="Model · OpenRouter">
        <OptionList
          mono
          aria-label="Model"
          value={model}
          onChange={setModel}
          options={[
            { value: "gpt-5.5", label: "openai/gpt-5.5", sub: "smart" },
            { value: "gemini", label: "google/gemini-2.5-flash", sub: "cheap" },
          ]}
        />
      </Field>
      <Field label="Length">
        <SegmentedControl
          aria-label="Length"
          value={length}
          onChange={setLength}
          options={[
            { value: "brief", label: "Brief", sub: "~400w" },
            { value: "standard", label: "Standard", sub: "~800w" },
            { value: "deep", label: "Deep", sub: "~1500w" },
          ]}
        />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <Switch checked={scheduled} onChange={setScheduled} aria-label="Enable schedule" />
        <span className="text-sm text-body">Enable automatic weekly posts</span>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

function Gallery() {
  const [tab, setTab] = useState("card");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10 md:px-10">
      <header className="mb-8">
        <Logo />
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">Design system</h1>
        <p className="mt-1.5 max-w-[620px] text-[15px] text-secondary">
          The single, light-theme language behind every PostForge screen — imported from
          PostForge.dc.html and rendered here with the real tokens.
        </p>
      </header>

      <Section n="01" title="Color">
        <Row label="Neutrals">
          <Swatch name="bg" value="#f7f8f8" />
          <Swatch name="surface" value="#ffffff" />
          <Swatch name="border" value="#e7eae9" />
          <Swatch name="muted" value="#8a928e" />
          <Swatch name="secondary" value="#59615c" />
          <Swatch name="ink" value="#0b1210" />
        </Row>
        <Row label="Primary — Emerald">
          <Swatch name="50" value="#ecfdf5" />
          <Swatch name="200" value="#a7f3d0" />
          <Swatch name="400" value="#34d399" />
          <Swatch name="600 · primary" value="#059669" dark />
          <Swatch name="700" value="#047857" />
          <Swatch name="900" value="#064e3b" />
        </Row>
        <Row label="Semantic">
          <Swatch name="success" value="#059669" />
          <Swatch name="warning" value="#d97706" />
          <Swatch name="error" value="#f43f5e" />
          <Swatch name="info" value="#2563eb" />
        </Row>
        <Row label="Per-agent accents">
          {AGENTS.map((a) => (
            <Swatch key={a.id} name={a.label} value={a.color} />
          ))}
        </Row>
      </Section>

      <Section n="02" title="Typography">
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[180px] flex-1">
            <div className="text-[34px] font-semibold tracking-[-0.02em]">Geist</div>
            <div className="mt-1 text-xs text-muted">UI · sans-serif</div>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="font-serif text-[34px] font-medium">Newsreader</div>
            <div className="mt-1 text-xs text-muted">Post body · serif</div>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="font-mono text-[30px] font-medium">Geist Mono</div>
            <div className="mt-1 text-xs text-muted">Data · monospace</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-divider pt-4">
          <div className="flex items-baseline gap-4">
            <span className="w-[90px] font-mono text-[11px] text-faint">display/44</span>
            <span className="text-[44px] font-semibold tracking-[-0.03em]">Topic in, post out</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-[90px] font-mono text-[11px] text-faint">h1/27</span>
            <span className="text-[27px] font-semibold tracking-[-0.02em]">Section heading</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-[90px] font-mono text-[11px] text-faint">body/15</span>
            <span className="text-[15px] text-body">The quick agent verifies every claim before publishing.</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-[90px] font-mono text-[11px] text-faint">article/19</span>
            <span className="font-serif text-[19px] text-article">Autonomous systems moved from demo to deployment.</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-[90px] font-mono text-[11px] text-faint">mono/12</span>
            <span className="font-mono text-xs text-secondary">hai.stanford.edu · claude-sonnet-4.6</span>
          </div>
        </div>
      </Section>

      <Section n="03" title="Radius · Elevation · Spacing">
        <Row label="Radius">
          {[
            ["6", "rounded-sm"],
            ["10", "rounded-lg"],
            ["16", "rounded-2xl"],
            ["pill", "rounded-full"],
          ].map(([n, cls]) => (
            <div key={n} className="text-center">
              <div className={`h-11 w-11 border-[1.5px] border-primary-400 bg-primary-50 ${cls}`} />
              <div className="mt-1.5 font-mono text-[10px] text-faint">{n}</div>
            </div>
          ))}
        </Row>
        <Row label="Elevation">
          {[
            ["xs", "shadow-xs"],
            ["md", "shadow-md"],
            ["lg", "shadow-lg"],
          ].map(([n, cls]) => (
            <div key={n} className="text-center">
              <div className={`h-[60px] w-20 rounded-xl bg-surface ${cls}`} />
              <div className="mt-2 font-mono text-[10.5px] text-faint">{n}</div>
            </div>
          ))}
        </Row>
        <Row label="Spacing · 8px">
          {[8, 16, 24, 32, 48].map((s) => (
            <div key={s} className="text-center">
              <div className="bg-primary-500" style={{ width: s, height: s, borderRadius: 3 }} />
              <div className="mt-1.5 font-mono text-[10px] text-faint">{s}</div>
            </div>
          ))}
        </Row>
      </Section>

      <Section n="04" title="Buttons">
        <Row label="Variants">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="destructiveSolid">Delete</Button>
          <Button loading>Loading</Button>
        </Row>
        <Row label="Sizes & icons">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg" rightIcon={<ArrowRightIcon size={16} />}>
            Generate post
          </Button>
          <Button leftIcon={<PlusIcon size={15} />}>New Post</Button>
          <Button disabled>Disabled</Button>
        </Row>
      </Section>

      <Section n="05" title="Badges & chips">
        <Row label="Status badges">
          <Badge tone="success">Published</Badge>
          <Badge tone="info">Generating</Badge>
          <Badge tone="warning">Queued</Badge>
          <Badge tone="error">Failed</Badge>
          <Badge tone="primary" dot>
            Live
          </Badge>
          <Badge tone="neutral">Draft</Badge>
        </Row>
        <Row label="Chips & avatars">
          <Chip onClick={() => {}}>World Cup 2026</Chip>
          <Chip mono icon={<SearchIcon size={12} className="text-info" />}>
            ai agents 2026
          </Chip>
          <Avatar name="Ada Lovelace" />
          <Avatar name="PostForge" size={44} background="linear-gradient(135deg,#7c3aed,#a78bfa)" />
          <Tooltip content="Keyboard-accessible tooltip">
            <Button variant="secondary" size="sm">
              Hover me
            </Button>
          </Tooltip>
        </Row>
      </Section>

      <Section n="06" title="Forms">
        <FormDemo />
      </Section>

      <Section n="07" title="Feedback — toasts, modal, skeletons">
        <ToastDemo />
        <Row label="Modal / drawer">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
        </Row>
        <div>
          <div className="mb-3 text-[13.5px] font-semibold text-ink">Skeleton loaders</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <Skeleton height={40} radius={10} />
              <SkeletonText lines={3} />
            </div>
            <Skeleton height={110} radius={16} />
          </div>
        </div>
        <div>
          <div className="mb-3 text-[13.5px] font-semibold text-ink">Progress</div>
          <ProgressBar value={62} label="Poster render" />
        </div>
      </Section>

      <Section n="08" title="Stats & navigation">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <StatCard label="Posts generated" value="128" delta="↑ 12%" deltaTone="positive" />
          <StatCard label="Success rate" value="96%" delta="123 / 128" />
          <StatCard label="Avg. time" value="21s" delta="↓ 3s" deltaTone="positive" />
          <StatCard label="This month" value="34" delta="of 50" />
        </div>
        <div className="max-w-[240px] rounded-xl border border-border p-2">
          <NavItem icon={<DashboardIcon size={19} />} label="Dashboard" active />
          <NavItem icon={<LibraryIcon size={19} />} label="Library" badge={<Badge tone="primary">9</Badge>} />
        </div>
        <Tabs
          aria-label="Views"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "card", label: "Cards", count: 9 },
            { value: "list", label: "List" },
          ]}
        />
      </Section>

      <Section n="09" title="Signature — pipeline primitives">
        <div>
          <div className="mb-3 text-[13.5px] font-semibold text-ink">
            PipelineStepper (AgentTimelineNode ×6 + connectors)
          </div>
          <PipelineDemo />
        </div>
        <div>
          <div className="mb-3 text-[13.5px] font-semibold text-ink">AgentTimelineNode — every state</div>
          <div className="flex flex-wrap gap-8">
            <AgentTimelineNode agent="research" state="done" sublabel="4.2s" />
            <AgentTimelineNode agent="verify" state="active" progress={62} sublabel="live" />
            <AgentTimelineNode agent="write" state="queued" />
            <AgentTimelineNode agent="verify" state="failed" sublabel="error" />
          </div>
        </div>
        <div>
          <div className="mb-3 text-[13.5px] font-semibold text-ink">StageCard (expandable)</div>
          <div className="flex flex-col gap-3">
            <StageCard agent="research" state="done" summary="6 sources" defaultOpen>
              <div className="flex flex-wrap gap-2">
                <Chip mono icon={<SearchIcon size={12} className="text-info" />}>
                  world cup 2026 hosts
                </Chip>
                <Chip mono icon={<SearchIcon size={12} className="text-info" />}>
                  fifa expansion 48 teams
                </Chip>
              </div>
            </StageCard>
            <StageCard agent="write" state="active" summary="streaming…">
              <p className="font-serif text-[16.5px] leading-relaxed text-article">
                The 2026 World Cup will be the first hosted across three nations…
              </p>
            </StageCard>
            <StageCard agent="publish" state="queued" />
          </div>
        </div>
      </Section>

      <Section n="10" title="Signature — source citations">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <SourceCitationChip index={1} title="AI Index Report 2026" domain="hai.stanford.edu" verified href="#" />
          <SourceCitationChip index={2} title="The State of AI Agents" domain="sequoiacap.com" href="#" />
        </div>
        <div className="max-w-[420px]">
          <SourceCitationChip index={3} title="OpenRouter model catalog" domain="openrouter.ai" variant="row" />
        </div>
      </Section>

      <Section n="11" title="Empty & error states">
        <EmptyState
          icon={<LibraryIcon size={26} />}
          title="No posts yet"
          description="Generate your first post and it will show up here, with its poster and cited sources."
          action={
            <Button leftIcon={<PlusIcon size={15} />}>New Post</Button>
          }
        />
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete this post?"
        description="This can't be undone. The poster and sources will be removed too."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructiveSolid" onClick={() => setModalOpen(false)}>
              Delete post
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">
          Modals lock body scroll, close on Escape / overlay click, and move focus into the panel.
        </p>
      </Modal>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <Gallery />
    </ToastProvider>
  );
}
