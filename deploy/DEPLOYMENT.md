# Automated deployment: GitHub → Docker Hub → your server

```
git push origin main
   │
   ▼
GitHub Actions ── CI ───────────── lint, build, API smoke test, dependency audit
   │
   ├── Build & push ───────────── docker.io/<DOCKERHUB_USERNAME>/chat-ai:sha-<commit>  (+ :latest)
   │
   └── Deploy (over SSH) ──────── uploads docker-compose.yml, Caddyfile and a .env built from secrets
                                  → server runs `docker compose pull` (fetches the image from Docker Hub)
                                  → restarts the app, waits until it is healthy
                                  → checks https://<DOMAIN>/api/health
```

On the server, three containers run: **app** (this project), **mongo** (database, private to the server) and **caddy** (HTTPS with automatic Let's Encrypt certificates).

Pull requests and pushes to other branches only run CI. Nothing is deployed.

---

## 1. What you need

| Item          | Where to get it                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| A server      | Any Ubuntu 22.04+/Debian 12+ VPS with a public IP (1 GB RAM minimum, 2 GB recommended). DigitalOcean, Hetzner, AWS EC2, Lightsail... |
| A domain      | Create a DNS **A record**, e.g. `chat.example.com` → your server's IP                                             |
| Docker Hub    | Free account at [hub.docker.com](https://hub.docker.com)                                                         |
| Clerk         | Dashboard → create a **Production** instance for your domain → API keys                                          |
| Gemini        | [aistudio.google.com/apikey](https://aistudio.google.com/apikey)                                                  |
| ImageKit      | Dashboard → Developer options                                                                                     |

## 2. Prepare the server (once)

SSH into the server and run the setup script. It installs Docker, opens ports 22/80/443, creates the `~/chat-ai` directory, and creates the SSH key GitHub Actions will use:

```sh
curl -fsSL https://raw.githubusercontent.com/Saatwikkk/Chat-AI/main/deploy/setup-server.sh | bash
```

Or copy [setup-server.sh](setup-server.sh) to the server and run `bash setup-server.sh`.

At the end it prints `SSH_HOST`, `SSH_USER` and the private key `SSH_PRIVATE_KEY` for step 4. Copy them, then delete the private key from the server as the script tells you.

## 3. Create a Docker Hub access token

Docker Hub → **Account settings → Personal access tokens → Generate new token**
- Description: `github-actions`
- Permissions: **Read & Write**

The token is shown once, so copy it. Docker Hub creates the `chat-ai` repository on the first push. It is public by default; make it private in its settings if you prefer. The deploy logs the server in, so private works too.

## 4. Add secrets and variables to GitHub

Repository → **Settings → Secrets and variables → Actions**.

### Secrets (tab "Secrets")

| Name                    | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| `DOCKERHUB_TOKEN`       | `<DOCKER_HUB_ACCESS_TOKEN>` from step 3                       |
| `SSH_HOST`              | `<SERVER_IP_OR_HOSTNAME>`                                     |
| `SSH_USER`              | `<SERVER_USERNAME>` (e.g. `ubuntu`)                           |
| `SSH_PRIVATE_KEY`       | `<PRIVATE_KEY>` printed by setup-server.sh (whole block)      |
| `MONGO_ROOT_PASSWORD`   | `<STRONG_RANDOM_PASSWORD>`, letters and digits only. Generate with `openssl rand -hex 24` |
| `CLERK_PUBLISHABLE_KEY` | `<pk_live_...>`                                               |
| `CLERK_SECRET_KEY`      | `<sk_live_...>`                                               |
| `GEMINI_API_KEY`        | `<YOUR_GEMINI_API_KEY>`                                       |
| `IMAGE_KIT_ENDPOINT`    | `<https://ik.imagekit.io/YOUR_IMAGEKIT_ID>`                   |
| `IMAGE_KIT_PUBLIC_KEY`  | `<public_...>`                                                |
| `IMAGE_KIT_PRIVATE_KEY` | `<private_...>`                                               |
| `MONGODB_URI`           | *Optional.* `<mongodb+srv://...>` to use MongoDB Atlas instead of the bundled database |
| `SSH_FINGERPRINT`       | *Optional, recommended.* Server host key fingerprint. Run `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server and paste the `SHA256:...` part |

### Variables (tab "Variables")

| Name                  | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| `DOCKERHUB_USERNAME`  | `<YOUR_DOCKERHUB_USERNAME>`                            |
| `DOMAIN`              | `<YOUR_DOMAIN>`, e.g. `chat.example.com` (no `https://`) |
| `IMAGE_NAME`          | *Optional.* Docker Hub repository name. Default `chat-ai` |
| `DEPLOY_PATH`         | *Optional.* Directory on the server. Default `chat-ai` (in the SSH user's home) |
| `SSH_PORT`            | *Optional.* Default `22`                               |
| `MONGO_ROOT_USERNAME` | *Optional.* Default `chatai`                           |
| `GEMINI_MODEL`        | *Optional.* Default `gemini-flash-latest`              |
| `AI_DAILY_LIMIT`      | *Optional.* AI replies per user per day. Default `200` |

`DOCKERHUB_USERNAME` and `DOMAIN` are variables rather than secrets on purpose. GitHub hides secret values in logs, and that would break image tags and job outputs that contain them.

### Optional: require approval before production deploys

The deploy job uses the GitHub environment **production**. Under **Settings → Environments → production → Required reviewers**, you can add yourself so each deploy waits for your click.

## 5. Deploy

```sh
git push origin main
```

Watch it under the repository's **Actions** tab. The first deploy takes a few minutes. Caddy gets the HTTPS certificate on first start, so the domain's DNS must already point at the server.

In the Clerk dashboard, make sure your domain is configured for the production instance.

## Everyday operations

**Roll back:** Actions → **Deploy** → **Run workflow** → enter an earlier tag such as `sha-1a2b3c4` (listed on Docker Hub). This redeploys that image without rebuilding.

**Logs and status** (on the server):

```sh
cd ~/chat-ai
docker compose ps
docker compose logs -f app
```

**Back up the database** (on the server):

```sh
cd ~/chat-ai
docker compose exec -T mongo sh -c 'mongodump --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' > backup-$(date +%F).gz
```

Restore with `mongorestore --archive --gzip` the same way, piping the file in.

**Change a secret:** update it in GitHub, then rerun the latest Deploy run, or Run workflow with the current tag. The server's `.env` is regenerated on every deploy.

> Don't change `MONGO_ROOT_PASSWORD` after the first deploy. MongoDB only reads it when the database is first created. To change it later, change the password inside MongoDB first.

## Troubleshooting

| Problem                                    | Fix                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `Missing secret/variable: X`               | Add `X` in step 4 (names are case-sensitive)                                 |
| `ssh: handshake failed` / `unable to authenticate` | Check `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (include the BEGIN/END lines) |
| `permission denied ... docker.sock`        | The SSH user isn't in the `docker` group yet: rerun setup-server.sh, or `sudo usermod -aG docker <user>` |
| App never becomes healthy                  | The workflow prints the app logs. Usually a wrong key or database URI        |
| Public health check fails, app is healthy  | DNS not pointing at the server yet, or ports 80/443 blocked by the provider's firewall |
| Sign-in fails in production                | Use Clerk **production** keys and add your domain in the Clerk dashboard     |
