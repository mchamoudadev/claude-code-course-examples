---
name: github-actions-deploy
description: Set up GitHub Actions CI/CD that tests every push/PR (lint, typecheck, unit tests, production build) and, only when main is green, SSH-deploys to a VPS (git pull → npm ci → build → restart the systemd service → smoke test). Use after the app already runs on the server via systemd + Nginx (see the deploy-nextjs-vps-nginx skill). No Docker; build happens on the server.
---

# GitHub Actions CI/CD → SSH deploy to a VPS

Add a pipeline that gates every change behind tests and auto-deploys `main` to a
VPS over SSH. This is the exact workflow used for PostForge.

**Prerequisites**
- App already deployed once and running on the server (systemd service +
  Nginx). See the **deploy-nextjs-vps-nginx** skill.
- A `deploy` user on the server with **passwordless sudo** for the service
  restart (`sudo systemctl restart <service>`).
- The server can already `git pull` the repo (deploy key installed).

Placeholders: `SERVICE` = `postforge`, `APPDIR` = `~/post-forge`,
`REPO` = `owner/name`.

---

## Step 1 — Create a dedicated CI→server SSH key

Never reuse a personal key for CI. Generate a throwaway keypair, authorize its
**public** half on the server, and store its **private** half as a GitHub secret.

```bash
# On your machine (temp dir):
ssh-keygen -t ed25519 -f ./ci_deploy -N "" -C "github-actions-deploy"

# Authorize the public key for the deploy user (APPEND — don't clobber):
CIPUB=$(cat ./ci_deploy.pub)
ssh <alias> "grep -qF '$CIPUB' ~/.ssh/authorized_keys || echo '$CIPUB' >> ~/.ssh/authorized_keys"
```

## Step 2 — Store the secrets in GitHub

```bash
gh secret set VPS_SSH_KEY --repo owner/name < ./ci_deploy
gh secret set VPS_HOST    --repo owner/name --body "SERVER_IP"
gh secret set VPS_USER    --repo owner/name --body "deploy"

# Shred the local private key — it now lives only in GitHub Secrets + the server:
rm -f ./ci_deploy ./ci_deploy.pub
```

(You can also add them in the GitHub UI: repo → Settings → Secrets and variables
→ Actions.)

## Step 3 — Add the workflow

Create `.github/workflows/deploy.yml`. Two jobs: `ci` (the gate) runs on every
push and PR; `deploy` runs only after `ci` passes on a push to `main`.

```yaml
name: CI / Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch: {}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  ci:
    name: Lint · Typecheck · Test · Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci --no-audit --no-fund
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- run          # `-- run` forces vitest single-run (no watch)
      - run: npm run build

  deploy:
    name: Deploy to VPS
    needs: ci
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Set up SSH to the server
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H "${{ secrets.VPS_HOST }}" >> ~/.ssh/known_hosts 2>/dev/null

      - name: Pull, build, and restart on the server
        run: |
          ssh -i ~/.ssh/deploy_key -o IdentitiesOnly=yes \
            "${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}" '
              set -e
              cd ~/post-forge
              git fetch --depth=1 origin main
              git reset --hard origin/main
              npm ci --no-audit --no-fund
              npm run build
              sudo systemctl restart postforge
              sleep 3
              systemctl is-active postforge
            '

      - name: Smoke-test the deployed app
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "http://${{ secrets.VPS_HOST }}/sign-in")
          echo "GET /sign-in -> HTTP $code"
          test "$code" = "200"
```

## Step 4 — Commit, push, watch

```bash
git add .github/workflows/deploy.yml && git commit -m "ci: add CI/CD" && git push
gh run watch "$(gh run list --repo owner/name -L1 --json databaseId --jq '.[0].databaseId')" --repo owner/name
```

---

## Design notes (why it's shaped this way)

- **Test gate before deploy.** `deploy` has `needs: ci`, so a failing lint/type/
  test/build blocks the deploy entirely. PRs run `ci` only (no deploy).
- **Build on the server, not artifact upload.** Simplest mental model and no
  `node_modules` transfer; fine when the VPS has enough RAM (Next build wants
  ~1–2 GB). For tiny boxes, build on the runner and `rsync` the output instead.
- **`git reset --hard origin/main`** guarantees the server matches the repo
  exactly (no drift from local edits).
- **Passwordless sudo** is scoped to the service restart via
  `/etc/sudoers.d/`; the SSH key is the real access boundary.
- **Concurrency group** prevents two deploys racing; PR runs cancel superseded
  ones.

## Common issues

- **Lint fails in CI but "passed locally"** — your local `node_modules` was
  stale. CI does a clean `npm ci`, pulling the exact locked (often newer) lint
  plugin versions. Reproduce locally with `npm ci` first. If a new rule flags
  intentional patterns, downgrade *that specific rule* to `warn` in the eslint
  config rather than disabling the gate.
- **`vitest` hangs the job** — it defaults to watch mode; use `npm test -- run`
  (or `vitest run`) in CI.
- **`npm ci` fails on the runner with "Missing … from lock file"** — the
  lockfile was generated on macOS and omits Linux optional deps. Regenerate on
  Linux (`npm install --package-lock-only`) and commit it.
- **`Permission denied (publickey)` in the deploy step** — the CI public key
  isn't in the server's `~deploy/.ssh/authorized_keys`, or `VPS_SSH_KEY` is
  missing a trailing newline. Re-run Step 1–2.
- **`sudo: a password is required`** — the deploy user lacks NOPASSWD sudo for
  the restart. Add `deploy ALL=(ALL) NOPASSWD:ALL` (or scope to the exact
  systemctl command) in `/etc/sudoers.d/`.
- **Smoke test fails after locking the origin to Cloudflare IPs** — the raw-IP
  probe is blocked; point it at the domain over HTTPS instead.
