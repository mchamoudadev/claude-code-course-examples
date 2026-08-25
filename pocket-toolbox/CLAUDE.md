# Pocket Toolbox — tool contract

- One component per file under `src/components/tools/`.
- Wrap the tool body in the shared card (`@/components/ToolCard`).
- Add `"use client"` only if the tool is interactive — App Router renders
  Server Components by default.
- A task is one tool's file plus its own `tasks/<tool>.md`. Never edit
  `src/app/page.tsx` or any other shared file.
- When a tool works, flip the status line in its own `tasks/<tool>.md` to `done`.
- Your own task file, never another worker's.
