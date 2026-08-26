# Claude Code Course: Example Projects

Everything built on camera in
[**Agentic Coding with Claude Code: Build & Ship a Real App**](https://dugsiiye.com/course/agentic-coding-with-claude-code-build-ship-a-real-app)
on Dugsiiye. Each folder is the exact state a project was left in after its lessons,
including the `.claude/` folders (skills, agents, agent memory) created during the course.
Every lesson on the platform has a "💻 Code" link that points back to the matching
folder or file here.

## Lesson by lesson

All 13 modules and 53 lessons, in course order, with what each lesson covers and what it
left behind in this repo. Modules that are terminal- or settings-only have no folder.

### Module 1 · Foundations

No project code — these lessons happen in the terminal.

| Lesson | What it covers |
| --- | --- |
| What Agentic Coding Actually Is | The shift from writing code yourself to directing an agent that explores, plans, edits, and reports back while you review and decide. |
| Install, Login, and Your First Session | Install the Claude Code CLI, sign in, and run a first session inside a project. |
| Comparing Different Models: Open Source and Closed Source | How to choose a model: capability, cost, context, and open vs closed weights. |
| Running Open Source Models on Our Claude Code | Point Claude Code at an open-source model backend instead of the default. |
| Use a Launcher Command (.zshrc / .bat File) | A shell alias / batch file so Claude Code starts with your preferred flags every time. |
| Daily-Driver Commands | The handful of slash commands and shortcuts you reach for in every session. |

### Module 2 · Context Is Everything → [`QuotesApp/`](QuotesApp)

Zero-dependency HTML/CSS/JS quotes keeper. Open `index.html` directly, no install.

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| The Workflow: Explore, Plan, Code, Commit | The four-step loop the whole course runs on: let Claude read first, agree a plan, execute, commit. | [`QuotesApp/`](QuotesApp) |
| Generic Plan Mode | Plan mode: Claude explores and proposes before it is allowed to write anything. | [`quotes-app-plan.md`](QuotesApp/quotes-app-plan.md) |
| Grill Me builds the Quotes App | Claude interviews you until every product decision is settled, then writes the plan. | [`quotes-app-plan.md`](QuotesApp/quotes-app-plan.md) — see its "Decisions" table |
| Code: Executing the Plan | Turn the agreed plan into working code in one pass. | [`index.html`](QuotesApp/index.html), [`style.css`](QuotesApp/style.css), [`script.js`](QuotesApp/script.js) |
| Commit: Sealing Each Work Cycle | Commit at the end of every cycle so each step is reviewable and reversible. | the commit history |
| Plan: Adding to Existing Code (Brownfield) | Planning a feature inside code that already exists, not a blank project. | the follow-up features in `QuotesApp/` |

### Module 3 · Project Memory → [`QuotesApp/CLAUDE.md`](QuotesApp/CLAUDE.md)

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| What CLAUDE.md Is (and Why Every Project Needs One) | Persistent project instructions Claude loads at the start of every session. | [`CLAUDE.md`](QuotesApp/CLAUDE.md), [`post-forge/CLAUDE.md`](post-forge/CLAUDE.md) |
| Writing Your First CLAUDE.md | Writing one for the Quotes App: what the project is, how to run it, what to avoid. | [`CLAUDE.md`](QuotesApp/CLAUDE.md) |
| Windows Users: Location for the CLAUDE.md File | Where the file lives on Windows so it is picked up. | — |

### Module 4 · Custom Skills → [`QuotesApp/.claude/skills/`](QuotesApp/.claude/skills)

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| What Skills Are (and When to Reach for One) | Reusable, invocable instructions (`SKILL.md`) for work you repeat. | [`.claude/skills/`](QuotesApp/.claude/skills) |
| Skills with Arguments | A skill that takes input when you invoke it. | [`add-quote/`](QuotesApp/.claude/skills/add-quote/SKILL.md), [`add-quote-feature/`](QuotesApp/.claude/skills/add-quote-feature/SKILL.md) |
| The Bundled Skills: Using What Ships With Claude Code | The skills that come built in and when to use them. | — |
| Controlling Who Invokes a Skill (and What It Can Touch) | Restricting whether the user or Claude can trigger a skill, and what tools it may use. | [`micro-interactions/`](QuotesApp/.claude/skills/micro-interactions/SKILL.md), [`github-commit/`](QuotesApp/.claude/skills/github-commit/SKILL.md) |
| Skill Finder and Skill Marketplace | Finding and installing skills from the marketplace. | [`find-skill/`](QuotesApp/.claude/skills/find-skill/SKILL.md), [`skills-lock.json`](QuotesApp/skills-lock.json) |

### Module 5 · Permissions & Hooks

Settings-only lesson (`.claude/settings.json`) — no project code.

| Lesson | What it covers |
| --- | --- |
| Hooks: Guarantee vs Suggest | A CLAUDE.md instruction only suggests; a hook runs every time, guaranteed. Permissions and hooks in `settings.json`. |

### Module 6 · Subagents & Skills → [`QuotesApp/.claude/agents/`](QuotesApp/.claude/agents)

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| Subagents: Specialists in Their Own Context | A subagent with its own prompt, tools, and context window; memory that persists between runs. | [`quotes-app-code-reviewer.md`](QuotesApp/.claude/agents/quotes-app-code-reviewer.md) and its [`.claude/agent-memory/`](QuotesApp/.claude/agent-memory) |
| A Skill That Runs as a Subagent | Pairing a skill with an agent so the skill executes in its own context. | [`github-commit-runner.md`](QuotesApp/.claude/agents/github-commit-runner.md) with the [`github-commit`](QuotesApp/.claude/skills/github-commit/SKILL.md) skill |

### Module 7 · MCP: Connecting Claude to the Outside World

MCP server configuration — no project code.

| Lesson | What it covers |
| --- | --- |
| MCP: Connecting Claude to the Outside World | What MCP servers are and how to add one to Claude Code. |
| MCP Real-World Example: Zoom & Notion | Driving Zoom and Notion from Claude Code through their MCP servers. |

### Module 8 · The Claude Ecosystem: Chrome, Desktop & Remote

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| Claude Code in Chrome: GIF Creator Tool | Claude drives your browser and records the run as a GIF. | [`quotes-app-e2e-test.gif`](QuotesApp/quotes-app-e2e-test.gif) |
| Claude Desktop Preview | Claude Code inside the desktop app. | — |
| Claude Teleport Feature | Moving a session between machines and surfaces. | — |
| Claude Code Remote Control | Controlling a running session from another device. | — |

### Module 9 · Customizing Your Claude Code Setup

Setup and config lessons — no project code.

| Lesson | What it covers |
| --- | --- |
| Claude Code with the Telegram Plugin | Talk to a Claude Code session from Telegram. |
| Install the GitHub App | Connect Claude Code to GitHub for PRs and reviews. |
| Claude Code Status Line | A custom status line showing model, branch, and context. |
| Rename & Coloring in Claude Code | Naming and colour-coding sessions. |
| Fullscreen Rendering in Claude Code | Fullscreen terminal rendering mode. |
| Voice Mode in Claude Code | Talking to Claude Code instead of typing. |

### Module 10 · Parallel & Background Work → [`pocket-toolbox/`](pocket-toolbox)

Next.js toolbox of 12 small utilities (BMI, age calculator, coin flip, color converter, ...),
one task spec per tool in [`tasks/`](pocket-toolbox/tasks).

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| Parallel & Background Work: Worktrees, Background Subagents, /batch & Dynamic Workflows | Overview of running several tasks at once instead of one after another. | the 12 tools under [`src/components/tools/`](pocket-toolbox/src/components/tools) |
| Git Worktrees: Two Tasks at Once | Two Claude sessions working in separate worktrees of the same repo. | two tools built side by side in separate worktrees |
| Background a Subagent | Hand a long job to a subagent and keep working while it runs. | the audit that flagged [`tip-calculator.tsx`](pocket-toolbox/src/components/tools/tip-calculator.tsx) |
| /batch & Dynamic Workflows | Fan a task list out to many agents with `/batch` and workflow scripts. | the workflow that consumed [`tasks/*.md`](pocket-toolbox/tasks) |

### Module 11 · Designing with AI

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| How to Get Beautiful Design Resources for Your AI Coding Agent | Where to source designs an agent can implement: Figma community files, Stitch, Claude Design. | — |
| Implementing Pixel-Perfect Design Using Figma MCP into Claude Code | Read a Figma frame through the Figma MCP and rebuild it exactly. | [`crypto-paradise/`](crypto-paradise): React rebuild of a Figma "Crypto NFT Dashboard" |
| Designing a Modern Mobile App Using Stitch by Google | Generate mobile screens with Stitch and use them as a design source. | [`crypto-mobile-app/`](crypto-mobile-app): Stitch screens (`screen.png` + `code.html` per screen) |
| Designing Beautiful UIs Using Claude Design | Design a dashboard on a Claude Design canvas. | [`ledgerly-dashboard/`](ledgerly-dashboard) |
| Implement the Design Using Claude Code | Turn the canvas into a working React + Vite app. | [`ledgerly-dashboard/`](ledgerly-dashboard): React + Vite crypto dashboard built from the canvas |

### Module 12 · Building Our Project: Multi-Agent & Parallel Execution → [`post-forge/`](post-forge)

Next.js app that turns a topic into a researched, fact-checked, illustrated post.
Built as 19 tasks by an orchestrator agent, then secured and deployed to a VPS.

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| Multi-Agent System Overview | The architecture: a network of agents (research → verify → write → edit → illustrate → publish) inside a durable Inngest function. | [`PLAN.md`](post-forge/PLAN.md) |
| Design the UI/UX of Our Project Using Claude Design | Designing PostForge's screens on a Claude Design canvas. | [`design-src/PostForge.dc.html`](design-src/PostForge.dc.html) (Claude Design canvas), [`DESIGN_PROMPT.md`](post-forge/DESIGN_PROMPT.md) |
| Creating a Task List & Acceptance Criteria | Splitting the build into 19 tasks, each with a BRD and acceptance criteria. | [`tasks/`](post-forge/tasks): T01 to T19 BRDs, `status.json` |
| Implementing the 19 Tasks in Parallel — Part 1 | The orchestrator loop: read `status.json`, dispatch every ready task to its own subagent in its own worktree, verify, drain reports, repeat. | [`ORCHESTRATOR.md`](post-forge/ORCHESTRATOR.md), [`tasks/REPORTS.md`](post-forge/tasks/REPORTS.md) |
| Implementing the 19 Tasks in Parallel — Part 2 | The loop continues through the middle waves of tasks. | [`ORCHESTRATOR.md`](post-forge/ORCHESTRATOR.md), [`tasks/REPORTS.md`](post-forge/tasks/REPORTS.md) |
| Implementing the 19 Tasks in Parallel — Part 3 | The final waves through the end-to-end verification gate; the app itself. | [`post-forge/`](post-forge) |

### Module 13 · Shipping to Production → [`post-forge/`](post-forge)

| Lesson | What it covers | Code in this repo |
| --- | --- | --- |
| Purchasing a VPS & Domain Name | Buy a VPS and domain, then let a skill do the SSH setup. | [`.claude/skills/vps-ssh-setup/`](post-forge/.claude/skills/vps-ssh-setup/SKILL.md) |
| Preparing for Production Security Fixes | Auditing the app for production: secrets, auth, rate limits, input validation. | [`SECURITY_CHECKLIST.md`](post-forge/SECURITY_CHECKLIST.md) |
| Setup MongoDB Atlas | A hosted MongoDB cluster and the production env vars. | [`.env.production.example`](post-forge/.env.production.example) |
| Deploying to the VPS (nginx, GitHub Actions) | nginx in front of Next.js and a GitHub Actions deploy on push. | [`.claude/skills/deploy-nextjs-vps-nginx/`](post-forge/.claude/skills/deploy-nextjs-vps-nginx/SKILL.md), [`.claude/skills/github-actions-deploy/`](post-forge/.claude/skills/github-actions-deploy/SKILL.md), [`.github/workflows/deploy.yml`](post-forge/.github/workflows/deploy.yml) |

## Running a project

Each Node project has its own `package.json`: `cd` into it, run `npm install`, then
`npm run dev`. `QuotesApp` needs no install; open `index.html` directly.

Projects that need API keys ship a `.env.example` / `.env.production.example`; copy it to
`.env` and fill in your own values. Real `.env` files are git-ignored.
