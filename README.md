# Claude Code Course — Example Projects

Companion code for **[Agentic Coding with Claude Code: Build & Ship a Real App](https://dugsiiye.com/course/agentic-coding-with-claude-code-build-ship-a-real-app)**
(taught in Af-Soomaali). Everything here was built live in the lessons — the course map
below lists every module and lesson, and which folder in this repo it uses.

## Course map

### Module 1 · Foundations
- What Agentic Coding Actually Is
- Install, Login, and Your First Session
- Comparing Different Models: Open Source and Closed Source
- Running Open Source Models on Our Claude Code
- Use a Launcher Command (.zshrc / .bat File)
- Daily-Driver Commands

**Example:** terminal-only lessons — no project code.

### Module 2 · Context Is Everything
- The Workflow: Explore, Plan, Code, Commit
- Generic Plan Mode
- Grill Me builds the Quotes App
- Code: Executing the Plan
- Commit: Sealing Each Work Cycle
- Plan: Adding to Existing Code (Brownfield)

**Example:** [`QuotesApp/`](QuotesApp) — the plan from the "Grill Me" session is `quotes-app-plan.md`.

### Module 3 · Project Memory
- What CLAUDE.md Is (and Why Every Project Needs One)
- Writing Your First CLAUDE.md
- Windows Users: Location for the CLAUDE.md File

**Example:** [`QuotesApp/CLAUDE.md`](QuotesApp/CLAUDE.md) · [`post-forge/CLAUDE.md`](post-forge/CLAUDE.md)

### Module 4 · Custom Skills
- What Skills Are (and When to Reach for One)
- Skills with Arguments
- The Bundled Skills: Using What Ships With Claude Code
- Controlling Who Invokes a Skill (and What It Can Touch)
- Skill Finder and Skill Marketplace

**Example:** [`QuotesApp/.claude/skills/`](QuotesApp/.claude/skills) — `add-quote`, `add-quote-feature`, `micro-interactions`, `github-commit`, `find-skill`.

### Module 5 · Permissions & Hooks
- Hooks: Guarantee vs Suggest

**Example:** settings-only lesson (`.claude/settings.json`) — no project code.

### Module 6 · Subagents & Skills
- Subagents: Specialists in Their Own Context
- A Skill That Runs as a Subagent

**Example:** [`QuotesApp/.claude/agents/`](QuotesApp/.claude/agents) — `quotes-app-code-reviewer` and `github-commit-runner` (paired with the `github-commit` skill).

### Module 7 · MCP: Connecting Claude to the Outside World
- MCP: Connecting Claude to the Outside World
- MCP Real-World Example: Zoom & Notion

**Example:** MCP server configuration — no project code.

### Module 8 · The Claude Ecosystem: Chrome, Desktop & Remote
- Claude Code in Chrome: GIF Creator Tool
- Claude Desktop Preview
- Claude Teleport Feature
- Claude Code Remote Control

**Example:** [`QuotesApp/quotes-app-e2e-test.gif`](QuotesApp/quotes-app-e2e-test.gif) — recorded with the Chrome GIF creator.

### Module 9 · Customizing Your Claude Code Setup
- Claude Code with the Telegram Plugin
- Install the GitHub App
- Claude Code Status Line
- Rename & Coloring in Claude Code
- Fullscreen Rendering in Claude Code
- Voice Mode in Claude Code

**Example:** setup/config lessons — no project code.

### Module 10 · Parallel & Background Work
- Git Worktrees: Two Tasks at Once
- Background a Subagent
- /batch & Dynamic Workflows

**Example:** [`pocket-toolbox/`](pocket-toolbox) — 12 tools built in parallel from `tasks/*.md`. Worktrees are demoed on `QuotesApp/`.

### Module 11 · Designing with AI
- How to Get Beautiful Design Resources for Your AI Coding Agent
- Implementing Pixel-Perfect Design Using Figma MCP into Claude Code
- Designing a Modern Mobile App Using Stitch by Google
- Designing Beautiful UIs Using Claude Design
- Implement the Design Using Claude Code

**Example:** [`crypto-paradise/`](crypto-paradise) (Figma MCP) · [`crypto-mobile-app/`](crypto-mobile-app) (Stitch) · [`ledgerly-dashboard/`](ledgerly-dashboard) (Claude Design → code)

### Module 12 · Building Our Project: Multi-Agent & Parallel Execution
- Multi-Agent System Overview
- Design the UI/UX of Our Project Using Claude Design
- Creating a Task List & Acceptance Criteria
- Implementing the 19 Tasks in Parallel — Part 1
- Implementing the 19 Tasks in Parallel — Part 2
- Implementing the 19 Tasks in Parallel — Part 3

**Example:** [`design-src/`](design-src) (the Claude Design canvas) · [`post-forge/`](post-forge) (the app, `tasks/T01–T19`, `ORCHESTRATOR.md`)

### Module 13 · Shipping to Production
- Purchasing a VPS & Domain Name
- Preparing for Production Security Fixes
- Setup MongoDB Atlas

**Example:** [`post-forge/`](post-forge) — `SECURITY_CHECKLIST.md`, `.env.production.example`, and the deploy skills in `.claude/skills/`.

## The projects

### `QuotesApp/` — Modules 2–6, 8, 10
A zero-dependency quotes keeper: `index.html` + `style.css` + `script.js`, auto-saved to
`localStorage` with JSON export/import. No build step — open `index.html` in a browser.
This is the app the Explore → Plan → Code → Commit workflow is taught on.

What to look at:
- `quotes-app-plan.md` — the plan produced in "Grill Me builds the Quotes App"; the source of truth for product intent
- `CLAUDE.md` — project memory
- `.claude/skills/` — custom skills, including ones that take arguments
- `.claude/agents/` — subagent definitions; `.claude/agent-memory/` is what the code-reviewer agent remembered between runs
- `quotes-app-e2e-test.gif` — end-to-end run recorded with Claude in Chrome

### `pocket-toolbox/` — Module 10
Next.js app with 12 small utilities: age calculator, BMI calculator, coin flip, color
converter, countdown timer, dice roller, password generator, random number, stopwatch, tip
calculator, unit converter, word counter. Each has a spec in `tasks/*.md` that names the
one file it owns, so all 12 can be built at the same time with `/batch` and background
subagents without agents stepping on each other.

### `crypto-paradise/` — Module 11 (Figma MCP)
Pixel-perfect React 19 + Vite + TypeScript rebuild of the "Crypto NFT Dashboard (Light
Mode)" Figma freebie, generated through the Figma MCP. Figma variables become CSS design
tokens in `src/index.css`; fonts are bundled and all imagery is exported from Figma into
`public/assets`.

### `crypto-mobile-app/` — Module 11 (Stitch)
Mobile crypto dashboard designed with Google Stitch. `stitch_modern_crypto_dashboard/` has
one folder per screen (dashboard overview, market trends, portfolio tracking, profile
settings, …), each with its `screen.png` and generated `code.html`, plus a `DESIGN.md`
describing the system.

### `ledgerly-dashboard/` — Module 11 (Claude Design)
React + Vite crypto trading dashboard implemented from a Claude Design canvas — sidebar,
portfolio hero, price chart, holdings table, market movers, activity feed, quick-trade
panel — and wired up to be functional, not just a static port.

### `design-src/` — Module 12
`PostForge.dc.html` is the Claude Design canvas for PostForge's UI/UX (from "Design the
UI/UX of Our Project Using Claude Design"); `support.js` is its runtime. Open the HTML file
in a browser to view the design.

### `post-forge/` — Modules 12–13
The course's real app: an autonomous multi-agent post generator. Enter a topic and a
network of agents researches the web, verifies claims, writes, edits, illustrates a poster,
and publishes the post — running inside a durable Inngest function. Stack: Next.js 16,
Inngest + AgentKit, OpenRouter, Serper, MongoDB/GridFS, Vitest.

What to look at:
- `PLAN.md` — architecture and design rationale
- `ORCHESTRATOR.md` — the orchestrator prompt that dispatches one subagent per task in its own git worktree
- `tasks/` — `T01`–`T19` task specs with acceptance criteria, `status.json`, and the `REPORTS.md` build log
- `SECURITY_CHECKLIST.md` — the production security fixes
- `.claude/skills/` — `vps-ssh-setup`, `deploy-nextjs-vps-nginx`, `github-actions-deploy`
- `.env.example` / `.env.production.example` — env templates (MongoDB Atlas, OpenRouter, Serper, Inngest)

## Running a project

Each Node project has its own `package.json` — `cd` into it, `npm install`, then
`npm run dev`. `QuotesApp` and `design-src` need no install; open the HTML file directly.

Projects that need API keys ship a `.env.example` / `.env.production.example`; copy it to
`.env` and fill in your own values. Real `.env` files are git-ignored.
