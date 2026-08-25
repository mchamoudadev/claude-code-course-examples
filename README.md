# Claude Code Course — Example Projects

A suite of example projects built with Claude Code for the course
[**Agentic Coding with Claude Code — Build & Ship a Real App**](https://dugsiiye.com/course/agentic-coding-with-claude-code-build-ship-a-real-app).
Each folder is a self-contained demo of a planning, skills, agents,
or full-app workflow.

## Projects

| Project | What it demonstrates |
| --- | --- |
| [`QuotesApp/`](QuotesApp) | Zero-dependency HTML/CSS/JS quotes keeper. Includes custom skills, agents, and agent memory under `.claude/`. |
| [`pocket-toolbox/`](pocket-toolbox) | Next.js "toolbox" of small utilities (BMI, age calculator, coin flip, color converter…), each built from a task spec in `tasks/`. |
| [`post-forge/`](post-forge) | Next.js app that turns a topic into a researched, fact-checked, illustrated post — with an orchestrator plan, deploy skills, and a security checklist. |
| [`ledgerly-dashboard/`](ledgerly-dashboard) | React + Vite crypto trading dashboard implemented from a Claude Design canvas. |
| [`crypto-paradise/`](crypto-paradise) | React rebuild of a Figma "Crypto NFT Dashboard" design. |
| [`crypto-mobile-app/`](crypto-mobile-app) | Stitch mobile crypto dashboard screens used as a design source. |
| [`design-src/`](design-src) | Claude Design canvas source (`PostForge.dc.html`) for the PostForge UI. |

## Running a project

Each Node project has its own `package.json` — `cd` into it and run `npm install`, then
`npm run dev`. `QuotesApp` needs no install; open `index.html` directly.

Projects that need API keys ship a `.env.example` / `.env.production.example`; copy it to
`.env` and fill in your own values. Real `.env` files are git-ignored.
