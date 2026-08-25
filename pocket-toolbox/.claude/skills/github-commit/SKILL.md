---
name: github-commit
description: Commit and push the current changes to GitHub. Use when the user asks to commit, save, check in, push, or "commit and push" their work — stages changes, writes a clear message, and pushes to origin.
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *) Bash(git diff *)
context: fork
agent: "github-commit-runner"
---

# Commit & push to GitHub

Drive a clean commit + push for this repo (`origin` →
`github.com/mchamoudadev/quotes-app`, default branch `main`, `gh` CLI
available). Run the steps in order; stop and ask the user if anything
is ambiguous.

## Hard rules

- **No Claude attribution.** Never add a `Co-Authored-By: Claude …`
  trailer or any "Generated with Claude Code" line to the commit
  message or PR body. (Enforced by user + project prefs.)
- **Only commit/push when the user asked for it.** Don't sneak a
  commit into an unrelated task.
- **Never commit secrets.** Scan the diff for keys/tokens/passwords
  before staging. If found, stop and tell the user.

## 1. Inspect before staging

```bash
git status            # what's changed / untracked
git diff              # unstaged work
git diff --cached     # already-staged work
```

Read the actual diff — the commit message describes *why*, and you
can't write that without seeing what changed. Confirm no stray files
(scratch output, `.env`, build artifacts) are about to be committed.

## 2. Branch if you're on `main`

Committing straight to the default branch is usually wrong. Check:

```bash
git rev-parse --abbrev-ref HEAD
```

If it prints `main`, create a topic branch first (unless the user
explicitly said to commit to `main`):

```bash
git checkout -b <short-kebab-branch-name>
```

Name it for the change (`category-field`, `colorful-theme`,
`split-files`), not the date.

## 3. Stage

Stage intentionally — prefer explicit paths over `git add -A` so you
don't sweep in junk:

```bash
git add index.html style.css script.js   # example: list the files you mean
```

Re-run `git diff --cached` and confirm it's exactly what you intend.

## 4. Commit

Write a concise message: a ~50-char summary line, then a blank line,
then a short body explaining *why* if the change isn't self-evident.
Use a heredoc so the body formats correctly:

```bash
git commit -m "$(cat <<'EOF'
Short imperative summary of the change

Optional body: what changed and why. Wrap at ~72 cols.
EOF
)"
```

Do **not** append any co-author or "Generated with" trailer.

## 5. Push

First push of a new branch needs `-u`:

```bash
git push -u origin HEAD
```

On an already-tracked branch, plain `git push` is enough.

## 6. (Optional) Open a PR

Only if the user asks. `gh` is installed and authenticated:

```bash
gh pr create --fill --base main
```

Keep the PR body free of Claude attribution too.

## Verify

After pushing, confirm it landed:

```bash
git log --oneline -1
git status            # should show "up to date with origin/<branch>"
```

## Gotchas

- **Already on `main` with a remote default-branch protection** →
  `git push` to `main` may be rejected. Branch + PR instead (steps
  2 & 6).
- **`gh` not authenticated in a fresh shell** → `gh auth status`; if
  it fails, the user must run `gh auth login` themselves (interactive
  — suggest they type `! gh auth login`).
- **Untracked files you don't want** are invisible to `git diff` —
  always check `git status` for the `??` section before `git add`.
