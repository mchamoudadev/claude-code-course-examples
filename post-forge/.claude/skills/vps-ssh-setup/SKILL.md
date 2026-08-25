---
name: vps-ssh-setup
description: Set up secure key-based SSH access to a fresh Ubuntu VPS and harden it (dedicated deploy user, ufw firewall, disable root + password login). Use when a student has just bought a VPS (Hostinger, DigitalOcean, Hetzner, Contabo, etc.) and needs to connect to it safely for the first time before deploying an app.
---

# Secure a fresh Ubuntu VPS for deployment

Walk the user through connecting to a brand-new VPS with an SSH key and hardening
it. This is the exact sequence used to set up the PostForge production server.

**Golden rule — never lock yourself out:** always verify that key-based login
works on a *fresh* connection **before** disabling password / root login. Do the
steps in order.

Ask the user for their **VPS IP address** up front (e.g. `187.127.125.71`). Use it
in place of `VPS_IP` everywhere below. Everything runs from the user's own
Mac/Linux machine unless a step says "on the VPS".

---

## Step 0 — Confirm the box is reachable (no login yet)

```bash
nc -z -G 8 VPS_IP 22 && echo "SSH port reachable" || echo "unreachable"
```

If unreachable, the VPS may still be provisioning, or the IP is wrong — stop and
have the user re-check the provider dashboard.

## Step 1 — Generate a dedicated SSH keypair (on the user's machine)

One key per server keeps things tidy and revocable. `-N ""` = no passphrase so
automation/CI can use it; use a passphrase for a human-only laptop key.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/postforge_vps -N "" -C "postforge-vps-$(whoami)"
cat ~/.ssh/postforge_vps.pub   # the PUBLIC key — safe to share/paste
```

The private key `~/.ssh/postforge_vps` must **never** leave the machine or be
committed to git.

## Step 2 — Install the PUBLIC key on the VPS

The user must authenticate **once** to install the key. They do this themselves —
you (Claude) must not type their password. Pick whichever works:

**Option A — `ssh-copy-id` (if the provider allows root password SSH):**
```bash
ssh-copy-id -i ~/.ssh/postforge_vps.pub -o StrictHostKeyChecking=accept-new root@VPS_IP
```
Have the user run this in **their own terminal** and enter the root password when
prompted. Success prints `Number of key(s) added: 1`.

**Option B — provider web console (works even when password SSH is disabled).**
Most hosts have a browser-based root terminal:
- **Hostinger:** hPanel → VPS → your server → **Browser terminal**.
- DigitalOcean: Droplet → **Console**. Hetzner: server → **Console**. Contabo: **VNC**.

In that web console, paste (substitute the user's actual public key):
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "KEY INSTALLED"
```

**If the password is rejected repeatedly:** the provider likely disabled root
password SSH, or the dashboard password is a *panel* password, not the SSH one.
Use Option B, or reset the root password in the dashboard.

## Step 3 — Verify key login works (BEFORE any hardening)

```bash
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes root@VPS_IP \
  'echo "LOGIN OK"; . /etc/os-release; echo "$PRETTY_NAME  $(uname -r)"'
```

Must print `LOGIN OK`. Do not continue until it does.

## Step 4 — Create a non-root `deploy` sudo user (run on the VPS)

Running services as root is bad practice. Create a dedicated user, give it
passwordless sudo (access is gated by the SSH key), and install the same key.

Run from the user's machine — it pipes a script to the VPS as root:

```bash
PUBKEY=$(cat ~/.ssh/postforge_vps.pub)
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes root@VPS_IP bash -s <<EOF
set -e
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-deploy
chmod 440 /etc/sudoers.d/90-deploy
visudo -cf /etc/sudoers.d/90-deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
id deploy
EOF
```

> Note on passwordless sudo: acceptable here because the *only* way in is the SSH
> key (password login gets disabled in Step 6). If you prefer sudo to require a
> password, set one with `passwd deploy` and drop the `NOPASSWD:` sudoers line.

## Step 5 — Verify `deploy` login + sudo (BEFORE locking down)

```bash
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes deploy@VPS_IP \
  'echo "deploy login OK as $(whoami)"; sudo -n whoami && echo "sudo OK"'
```

Must print `deploy login OK` and `sudo OK`. If not, fix it before Step 6 —
otherwise disabling root login can strand you.

## Step 6 — Firewall + disable root/password SSH (run on the VPS)

The sshd drop-in is named `00-` on purpose: sshd uses the **first** value it sees
for each option, and files in `/etc/ssh/sshd_config.d/` are read alphabetically —
so `00-*` overrides the provider's `50-cloud-init.conf` (which usually sets
`PasswordAuthentication yes`).

```bash
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes deploy@VPS_IP 'sudo -n bash -s' <<'EOF'
set -e
export DEBIAN_FRONTEND=noninteractive

# Firewall: allow SSH + web, deny the rest, then enable
apt-get install -y ufw >/dev/null 2>&1 || true
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status verbose

# Harden sshd
cat > /etc/ssh/sshd_config.d/00-postforge-hardening.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
CONF
chmod 644 /etc/ssh/sshd_config.d/00-postforge-hardening.conf

sshd -t && echo "sshd config VALID"
systemctl restart ssh
sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication) '
EOF
```

> Your current session stays alive during `systemctl restart ssh` — only *new*
> connections use the new rules. That's why the Step 7 checks open fresh
> connections.

## Step 7 — Verify the lockdown (fresh connections)

```bash
# 1. deploy key login — must SUCCEED
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes deploy@VPS_IP 'echo OK'

# 2. root login — must be REFUSED
ssh -i ~/.ssh/postforge_vps -o IdentitiesOnly=yes root@VPS_IP true 2>&1 | grep -qi 'denied\|closed' \
  && echo "root REFUSED (good)" || echo "WARNING root still allowed"

# 3. password auth — must be REFUSED (no prompt)
ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password deploy@VPS_IP true 2>&1 \
  | grep -qi 'permission denied (publickey)\|no more authentication' \
  && echo "password REFUSED (good)" || echo "check password auth"
```

## Step 8 — Add a local shortcut

So future logins are just `ssh <alias>`:

```bash
cat >> ~/.ssh/config <<'CFG'

Host postforge-vps
    HostName VPS_IP
    User deploy
    IdentityFile ~/.ssh/postforge_vps
    IdentitiesOnly yes
CFG
chmod 600 ~/.ssh/config
ssh postforge-vps 'echo "connected as $(whoami)@$(hostname)"'
```

Rename the `Host` alias per project so students can manage several servers.

---

## Result

- Key-only SSH as an unprivileged `deploy` user with sudo.
- Root SSH login and password auth both disabled.
- ufw firewall allowing only 22 / 80 / 443 inbound.
- `ssh <alias>` shortcut on the user's machine.

The provider's original root password is now inert over SSH. If it was ever
shared in plaintext, advise resetting it in the dashboard. The box is ready for
app deployment (Node runtime, systemd service, Nginx + TLS — separate steps).

## Common issues

- **`Permission denied (publickey,password)` after Step 2** — the key didn't
  install. Re-run Step 2 (check for a stray line-break in the pasted public key).
- **Password rejected on `ssh-copy-id`** — provider disabled root password SSH;
  use the web-console method (Option B).
- **Locked out after Step 6** — you skipped Step 5. Use the provider's web
  console to log in as root and fix `/home/deploy/.ssh/authorized_keys` or the
  sshd drop-in, then `systemctl restart ssh`.
- **`sshd -t` fails** — a typo in the drop-in file; the old config keeps running
  until you fix it and restart, so you're not locked out yet.
