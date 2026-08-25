# Claude Code Course: Example Projects

Everything built on camera in
[**Agentic Coding with Claude Code: Build & Ship a Real App**](https://dugsiiye.com/course/agentic-coding-with-claude-code-build-ship-a-real-app)
on Dugsiiye. Each folder is the exact state a project was left in after its lessons,
including the `.claude/` folders (skills, agents, agent memory) created during the course.
Every lesson on the platform has a "💻 Code" link that points back to the matching
folder or file here.

## Follow the course, folder by folder

### Modules 2 to 4: plan, code, commit, memory, skills → [`QuotesApp/`](QuotesApp)

Zero-dependency HTML/CSS/JS quotes keeper. Open `index.html` directly, no install.

| Lesson | What it produced here |
| --- | --- |
| Generic Plan Mode / Grill Me builds the Quotes App | [`quotes-app-plan.md`](QuotesApp/quotes-app-plan.md) |
| Code: Executing the Plan | [`index.html`](QuotesApp/index.html), [`style.css`](QuotesApp/style.css), [`script.js`](QuotesApp/script.js) |
| Commit: Sealing Each Work Cycle / Plan: Adding to Existing Code (Brownfield) | the commit history and the follow-up features |
| What CLAUDE.md Is / Writing Your First CLAUDE.md / Verify It Actually Loaded | [`CLAUDE.md`](QuotesApp/CLAUDE.md) |
| What Skills Are / Skills with Arguments / The Bundled Skills / Controlling Who Invokes a Skill | [`.claude/skills/`](QuotesApp/.claude/skills): `add-quote`, `add-quote-feature`, `micro-interactions`, `github-commit` |
| Skill Finder and Skill Marketplace | [`.claude/skills/find-skill/`](QuotesApp/.claude/skills/find-skill/SKILL.md), [`skills-lock.json`](QuotesApp/skills-lock.json) |
| Subagents: Specialists in Their Own Context | [`.claude/agents/quotes-app-code-reviewer.md`](QuotesApp/.claude/agents/quotes-app-code-reviewer.md) and its [`.claude/agent-memory/`](QuotesApp/.claude/agent-memory) |
| A Skill That Runs as a Subagent | [`.claude/agents/github-commit-runner.md`](QuotesApp/.claude/agents/github-commit-runner.md) |
| Claude Code in Chrome: GIF Creator Tool | [`quotes-app-e2e-test.gif`](QuotesApp/quotes-app-e2e-test.gif) |

### Parallel and background work → [`pocket-toolbox/`](pocket-toolbox)

Next.js toolbox of 12 small utilities (BMI, age calculator, coin flip, color converter, ...),
one task spec per tool in [`tasks/`](pocket-toolbox/tasks).

| Lesson | What it produced here |
| --- | --- |
| Parallel and Background Work | the 12 tools under [`src/components/tools/`](pocket-toolbox/src/components/tools) |
| Git Worktrees: Two Tasks at Once | two tools built side by side in separate worktrees |
| Background a Subagent | the audit that flagged [`tip-calculator.tsx`](pocket-toolbox/src/components/tools/tip-calculator.tsx) |
| Batch and Dynamic Workflows | the workflow that consumed [`tasks/*.md`](pocket-toolbox/tasks) |

### Design to code

| Lesson | Folder |
| --- | --- |
| Pixel-Perfect Design with Figma MCP | [`crypto-paradise/`](crypto-paradise): React rebuild of a Figma "Crypto NFT Dashboard" |
| Designing a Modern Mobile App with Stitch | [`crypto-mobile-app/`](crypto-mobile-app): Stitch mobile screens used as a design source |
| Designing Beautiful UIs with Claude Design / Implement the Design Using Claude Code | [`ledgerly-dashboard/`](ledgerly-dashboard): React + Vite crypto dashboard built from a Claude Design canvas |

### The final project: multi-agent build and ship → [`post-forge/`](post-forge)

Next.js app that turns a topic into a researched, fact-checked, illustrated post.
Built as 19 tasks by an orchestrator agent, then secured and deployed to a VPS.

| Lesson | What it produced here |
| --- | --- |
| Multi-Agent System Overview | [`PLAN.md`](post-forge/PLAN.md) |
| Design the UI/UX of Our Project | [`design-src/PostForge.dc.html`](design-src/PostForge.dc.html) (Claude Design canvas), [`DESIGN_PROMPT.md`](post-forge/DESIGN_PROMPT.md) |
| Creating a Task List and Acceptance Criteria | [`tasks/`](post-forge/tasks): T01 to T19 BRDs, `status.json` |
| Implementing the 19 Tasks in Parallel (Parts 1 to 3) | [`ORCHESTRATOR.md`](post-forge/ORCHESTRATOR.md), [`tasks/REPORTS.md`](post-forge/tasks/REPORTS.md), the app itself |
| Purchasing a VPS and Domain Name | [`.claude/skills/vps-ssh-setup/`](post-forge/.claude/skills/vps-ssh-setup/SKILL.md) |
| Preparing for Production: Security Fixes | [`SECURITY_CHECKLIST.md`](post-forge/SECURITY_CHECKLIST.md) |
| Setup MongoDB Atlas | [`.env.production.example`](post-forge/.env.production.example) |
| Deploying to the VPS (nginx, GitHub Actions) | [`.claude/skills/deploy-nextjs-vps-nginx/`](post-forge/.claude/skills/deploy-nextjs-vps-nginx/SKILL.md), [`.claude/skills/github-actions-deploy/`](post-forge/.claude/skills/github-actions-deploy/SKILL.md), [`.github/workflows/deploy.yml`](post-forge/.github/workflows/deploy.yml) |

## Running a project

Each Node project has its own `package.json`: `cd` into it, run `npm install`, then
`npm run dev`. `QuotesApp` needs no install; open `index.html` directly.

Projects that need API keys ship a `.env.example` / `.env.production.example`; copy it to
`.env` and fill in your own values. Real `.env` files are git-ignored.
