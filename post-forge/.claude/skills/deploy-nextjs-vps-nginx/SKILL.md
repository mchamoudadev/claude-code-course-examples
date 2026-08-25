---
name: deploy-nextjs-vps-nginx
description: Deploy a Next.js app to an Ubuntu VPS WITHOUT Docker — Node runtime, a systemd service running `next start`, an Nginx reverse proxy, and HTTPS via a Cloudflare Origin Certificate (Full (strict)) that keeps the Cloudflare proxy/CDN/DDoS protection on. Use after the server is SSH-hardened (see the vps-ssh-setup skill) and the app is on GitHub. Assumes a private repo and MongoDB Atlas.
---

# Deploy a Next.js app to a VPS with Nginx + Cloudflare TLS (no Docker)

Stand up a production Next.js app on a hardened Ubuntu VPS: Node → systemd
service on loopback:3000 → Nginx reverse proxy → HTTPS terminated with a
Cloudflare Origin Certificate. This is the exact setup used for PostForge.

**Prerequisites**
- Server already SSH-hardened with a `deploy` sudo user + key login (see the
  **vps-ssh-setup** skill). All commands run as `deploy` over `ssh <alias>`.
- App pushed to GitHub (private is fine). Domain on Cloudflare (proxied).
- Runtime secrets ready (DB URI, API keys) — never commit these.

Placeholders: `REPO` = `git@github.com:owner/name.git`, `APPDIR` =
`~/post-forge`, `DOMAIN` = `example.com`, `SERVICE` = `postforge`.

---

## Step 1 — Install Node.js (LTS) on the server

```bash
ssh <alias> 'sudo bash -c "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"'
ssh <alias> 'node -v && npm -v'
```

## Step 2 — Give the server read-only access to the private repo (deploy key)

Generate a key **on the server** and register its public half as a GitHub
**deploy key** (read-only). The private key never leaves the server.

```bash
ssh <alias> 'ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "vps-deploy"
  ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null
  printf "Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n" >> ~/.ssh/config
  cat ~/.ssh/github_deploy.pub'
```

Add that public key to the repo: **GitHub repo → Settings → Deploy keys → Add
deploy key** (leave "Allow write access" OFF). Or with the `gh` CLI from your
laptop: `gh repo deploy-key add key.pub --repo owner/name --title vps`.

## Step 3 — Clone the repo

```bash
ssh <alias> 'git clone --depth=1 git@github.com:owner/name.git ~/post-forge'
```

## Step 4 — Put production secrets on the server (never in git)

Create `APPDIR/.env.production` with real values. Next.js auto-loads it when
`NODE_ENV=production`. Copy from your machine (the file is gitignored):

```bash
scp .env.production <alias>:~/post-forge/.env.production
ssh <alias> 'chmod 600 ~/post-forge/.env.production'
```

Minimum for this stack: `MONGODB_URI` (Atlas SRV string incl. the db name),
plus whatever API keys the app requires. Use a **least-privilege** Atlas user and
restrict the Atlas IP allowlist to the VPS egress IP.

## Step 5 — First build

```bash
ssh <alias> 'cd ~/post-forge && npm ci --no-audit --no-fund && npm run build'
```

> **Cross-platform lockfile gotcha:** if `npm ci` fails on Linux with "Missing:
> …@… from lock file" (e.g. `@emnapi/*` pulled by `sharp`'s wasm variant), the
> lock was generated on macOS. Regenerate it on Linux with
> `npm install --package-lock-only`, commit that lock (it's a superset that still
> works on macOS), and re-pull. Do this BEFORE wiring CI, or the runner hits the
> same error.

## Step 6 — Run the app as a systemd service (loopback only)

Binding to `127.0.0.1` means only Nginx can reach the app — the port is never
exposed publicly.

```bash
ssh <alias> 'sudo tee /etc/systemd/system/postforge.service >/dev/null' <<'UNIT'
[Unit]
Description=PostForge (Next.js production server)
After=network.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/post-forge
Environment=NODE_ENV=production
ExecStart=/home/deploy/post-forge/node_modules/.bin/next start -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT

ssh <alias> 'sudo systemctl daemon-reload && sudo systemctl enable --now postforge && sleep 3 && systemctl is-active postforge && curl -s -o /dev/null -w "app: HTTP %{http_code}\n" http://127.0.0.1:3000/'
```

## Step 7 — Nginx reverse proxy

```bash
ssh <alias> 'sudo apt-get install -y nginx'
ssh <alias> 'sudo tee /etc/nginx/sites-available/postforge >/dev/null' <<'CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name example.com www.example.com;
    client_max_body_size 2m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 300s;
    }
}
CONF
ssh <alias> 'sudo ln -sf /etc/nginx/sites-available/postforge /etc/nginx/sites-enabled/postforge
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx'
```

The site is now live over **HTTP**. Confirm: `curl -I http://SERVER_IP/`.

## Step 8 — HTTPS with a Cloudflare Origin Certificate (keeps the proxy on)

This keeps Cloudflare's CDN/DDoS protection and hides the origin IP. The private
key is generated on the server and never shared — only the CSR (public) and the
signed cert (public) move.

**8a. Generate key + CSR on the server:**
```bash
ssh <alias> 'sudo install -d -m 700 /etc/ssl/postforge
  sudo openssl req -new -newkey rsa:2048 -nodes \
    -keyout /etc/ssl/postforge/origin.key -out /etc/ssl/postforge/origin.csr \
    -subj "/CN=example.com" \
    -addext "subjectAltName=DNS:example.com,DNS:www.example.com"
  sudo chmod 600 /etc/ssl/postforge/origin.key
  sudo cat /etc/ssl/postforge/origin.csr'
```

**8b. In Cloudflare:** SSL/TLS → Origin Server → **Create Certificate** → "Use my
private key and CSR" → paste the CSR → 15-year validity → Create. Copy the
**Origin Certificate** it shows.

**8c. Install the cert + verify it matches the key:**
```bash
ssh <alias> 'sudo tee /etc/ssl/postforge/origin.crt >/dev/null' <<'CERT'
-----BEGIN CERTIFICATE-----
...paste the Cloudflare Origin Certificate...
-----END CERTIFICATE-----
CERT
ssh <alias> 'c=$(sudo openssl x509 -noout -modulus -in /etc/ssl/postforge/origin.crt | openssl md5)
  k=$(sudo openssl rsa -noout -modulus -in /etc/ssl/postforge/origin.key | openssl md5)
  [ "$c" = "$k" ] && echo "cert/key MATCH" || echo "MISMATCH"'
```

**8d. Add the HTTPS server block** (append to the nginx file; note nginx <1.25
uses `listen 443 ssl` not `http2 on;`):
```nginx
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name example.com www.example.com;

    ssl_certificate     /etc/ssl/postforge/origin.crt;
    ssl_certificate_key /etc/ssl/postforge/origin.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    client_max_body_size 2m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 300s;
    }
}
```
```bash
ssh <alias> 'sudo nginx -t && sudo systemctl reload nginx'
```

**8e. In Cloudflare:** SSL/TLS → Overview → set mode to **Full (strict)**; Edge
Certificates → enable **Always Use HTTPS**. Keep the DNS records **proxied**
(orange cloud).

**Verify:** `curl -I https://example.com/` → `HTTP/2 200`, `server: cloudflare`.

---

## Alternative: Let's Encrypt (when NOT using a proxy)

If the domain is **not** proxied (DNS-only / grey cloud, or no Cloudflare), skip
step 8 and use certbot instead — portable and auto-renewing:
```bash
ssh <alias> 'sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d example.com -d www.example.com --agree-tos -m you@example.com --redirect'
```
certbot edits the nginx server block and installs a renewal timer. This needs
DNS to resolve **directly** to the server (HTTP-01 challenge on port 80).

## Harden the origin (optional but recommended with Cloudflare)

Because ufw allows 80/443 from anywhere, the origin IP is still directly
reachable if discovered — bypassing Cloudflare. Lock inbound web ports to
Cloudflare's published ranges so only Cloudflare can reach the origin:
```bash
# Fetch current ranges from https://www.cloudflare.com/ips/ and, for each:
#   sudo ufw allow from <cf_range> to any port 443 proto tcp
#   sudo ufw allow from <cf_range> to any port 80  proto tcp
# then remove the open 80/443 rules. Keep 22 open for SSH.
```
If you do this, any deploy smoke-test must hit the domain (via Cloudflare), not
the raw IP.

## Result

- App runs as an unprivileged systemd service on loopback:3000, auto-restarts.
- Nginx reverse-proxies 80/443 → app.
- HTTPS via a 15-year Cloudflare Origin Cert under Full (strict); proxy/CDN/DDoS
  protection stays on; origin IP hidden.
- Ready for CI/CD (see the **github-actions-deploy** skill).
