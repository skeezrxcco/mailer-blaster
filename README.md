# blastermailer

## Docker dev stack

This project includes a full Docker development environment with:

- `db` (`pgvector/pgvector:pg16`) for relational data + vector-ready AI memory
- `redis` for caching, rate-limits, queue primitives, and websocket fan-out adapters
- `nats` (JetStream enabled) for messaging/event streams and real-time pipeline events
- `mailpit` for local SMTP testing (OTP + transactional email inbox UI)
- API-only AI provider routing (OpenAI, Anthropic/Claude, DeepSeek, Grok/xAI, Llama API)

Recommended dev workflow:

- Run infra services in Docker.
- Run the Next.js app locally (`npm run dev`) for faster HMR/debugging.

Before first run:

```bash
make init
```

### Start infra services

```bash
make up
```

### Start infra services (alias)

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

### Optional: run app in Docker

```bash
make app-up
```

Then app is available at `http://localhost:3000`.

### Optional: Stripe webhook testing in Docker

Use Stripe CLI container to forward webhooks to your local app:

```bash
make stripe-up
make stripe-logs
```

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_FORWARD_TO` in `.env.docker`.

### Notes

- Docker env vars live in `.env.docker`.
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
- `deploy-main.yml`: runs on pushes to `main`, then builds and pushes a production image to Docker Hub, deploys to VPS via SSH, runs `npm run db:push`, and updates app containers.

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
- `AI_PROVIDER_PRIORITY`
- `AI_PROVIDER_STRICT`
- `AI_FREE_ONBOARDING_ENABLED`
- `AI_FREE_ONBOARDING_PLANS`
- `AI_FREE_REQUIRE_CAPS`
- `AI_FREE_DAILY_PER_USER`
- `AI_FREE_DAILY_OPENAI`
- `AI_FREE_DAILY_ANTHROPIC`
- `AI_FREE_DAILY_DEEPSEEK`
- `AI_FREE_DAILY_GROK`
- `AI_FREE_DAILY_LLAMA`
- `AI_FREE_WEIGHT_OPENAI`
- `AI_FREE_WEIGHT_ANTHROPIC`
- `AI_FREE_WEIGHT_DEEPSEEK`
- `AI_FREE_WEIGHT_GROK`
- `AI_FREE_WEIGHT_LLAMA`
- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_MAX_TOKENS`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `GROK_BASE_URL`
- `GROK_API_KEY`
- `GROK_MODEL`
- `LLAMA_BASE_URL`
- `LLAMA_API_KEY`
- `LLAMA_MODEL`
- `AUTH_CODE_TTL_MINUTES`
- `AUTH_CODE_RESEND_COOLDOWN_SECONDS`
- `WAITLIST_MODE` (optional; defaults to `true`)
- `STRIPE_SECRET_KEY` (optional)
- `STRIPE_WEBHOOK_SECRET` (optional)

## AI routing strategy (API-only)

- Supported providers: OpenAI, Anthropic/Claude, DeepSeek, Grok/xAI, and Llama API.
- `AI_PROVIDER=auto` enables dynamic routing + provider fallback.
- For onboarding plans (`AI_FREE_ONBOARDING_PLANS`), free usage is controlled by:
  - provider daily caps (`AI_FREE_DAILY_*`)
  - per-user daily cap (`AI_FREE_DAILY_PER_USER`)
  - weighted balancing (`AI_FREE_WEIGHT_*`)
- Selection score is `((used / cap) / weight)`, so lower-utilized and higher-weight providers are preferred.
- In production, `AI_FREE_REQUIRE_CAPS=true` prevents accidental uncapped free usage.
