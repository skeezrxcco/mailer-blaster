# mailer-blaster

## Docker dev stack

This project includes a full Docker development environment with:

- `db` (`pgvector/pgvector:pg16`) for relational data + vector-ready AI memory
- `redis` for caching, rate-limits, queue primitives, and websocket fan-out adapters
- `nats` (JetStream enabled) for messaging/event streams and real-time pipeline events
- `mailpit` for local SMTP testing (OTP + transactional email inbox UI)
- `ollama` for free local LLM inference (chat + content generation fallback)

Recommended dev workflow:

- Run infra services in Docker.
- Run the Next.js app locally (`npm run dev`) for faster HMR/debugging.

### Start infra services

```bash
make up
```

### Start infra services (without Ollama)

```bash
make up-lite
```

### Start infra + local app

```bash
make dev
```

### Stop

```bash
make down
```

### Logs

```bash
make logs
```

### URLs

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- NATS client: `localhost:4222`
- NATS monitor: `http://localhost:8222`
- Mailpit SMTP: `localhost:1025`
- Mailpit UI: `http://localhost:8025`
- Ollama API: `http://localhost:11434`

### Optional: run app in Docker

```bash
make app-up
```

Then app is available at `http://localhost:3000`.

### Optional: pull free local AI model

```bash
make ollama-pull
```

### Optional: Stripe webhook testing in Docker

Use Stripe CLI container to forward webhooks to your local app:

```bash
make stripe-up
make stripe-logs
```

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_FORWARD_TO` in `.env.docker`.

### Notes

- Docker env vars live in `/Users/ricardopires/Desktop/perso/AI-newsletter-agent/.env.docker`.
- See all commands with:

```bash
make help
```

## CI/CD

GitHub Actions workflows are configured as:

- `checks.yml`: runs on every branch push and PR, and executes:
  - `npm run db:generate`
  - `npm run lint` (if eslint is configured in dependencies)
  - `npm run typecheck --if-present`
  - `npm run test --if-present`
  - `npm run build`
- `deploy-main.yml`: runs on pushes to `main`, then builds and pushes a production image to Docker Hub and deploys to VPS via SSH.

Required GitHub repository secrets for deployment:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `AUTH_TRUST_HOST`
- `AUTH_EMAIL_FROM`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `REDIS_URL`
- `NATS_URL`
- `AI_PROVIDER`
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY` (optional if using local Ollama only)
- `OPENAI_MODEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `AUTH_CODE_TTL_MINUTES`
- `AUTH_CODE_RESEND_COOLDOWN_SECONDS`
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_WEBHOOK_SECRET` (optional)
