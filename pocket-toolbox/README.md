# Pocket Toolbox

A Next.js "toolbox" of 12 small utilities (BMI, age calculator, coin flip, color converter,
countdown timer, dice roller, password generator, random number, stopwatch, tip calculator,
unit converter, word counter). Each tool was built by its own agent from a task spec in
[`tasks/`](tasks), in parallel, during the "Parallel and Background Work" lessons of the
[Claude Code course](https://dugsiiye.com/course/agentic-coding-with-claude-code-build-ship-a-real-app).

```bash
npm install
npm run dev      # http://localhost:3000
```

Tools live in `src/components/tools/`, one file per tool, rendered through `ToolCard`.
