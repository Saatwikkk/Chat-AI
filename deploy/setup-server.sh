#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu/Debian server (run as a sudo-capable user):
#
#   curl -fsSL https://raw.githubusercontent.com/Saatwikkk/Chat-AI/main/deploy/setup-server.sh | bash
#   or copy this file to the server and run: bash setup-server.sh
#
# It installs Docker, creates the deploy directory, opens the firewall and
# prints the SSH key that GitHub Actions will use to deploy.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$HOME/chat-ai}"
KEY_PATH="$HOME/.ssh/github_actions_deploy"

echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "==> Creating deploy directory at $DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH"
chmod 700 "$DEPLOY_PATH"

echo "==> Configuring firewall (SSH, HTTP, HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 443/udp
  sudo ufw --force enable
fi

echo "==> Creating an SSH key for GitHub Actions"
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
if [ ! -f "$KEY_PATH" ]; then
  ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f "$KEY_PATH"
  cat "$KEY_PATH.pub" >> "$HOME/.ssh/authorized_keys"
  chmod 600 "$HOME/.ssh/authorized_keys"
fi

cat <<EOF

============================================================================
Done. Now add these to GitHub -> Settings -> Secrets and variables -> Actions:

  SSH_HOST         $(curl -fsS https://api.ipify.org 2>/dev/null || echo "<THIS_SERVER_PUBLIC_IP>")
  SSH_USER         $USER
  SSH_PRIVATE_KEY  (the whole private key below, including the BEGIN/END lines)

$(cat "$KEY_PATH")

Optional variable: DEPLOY_PATH = $DEPLOY_PATH

Then delete the private key from this server: rm $KEY_PATH
Log out and back in so your user can run docker without sudo.
============================================================================
EOF
