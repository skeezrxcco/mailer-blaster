# Auth Setup (Google, GitHub, Email Code)

## Authentication strategy

- Social providers (`google`, `github`) sign in directly with OAuth.
- Email/password uses two steps:
  1. Validate email/password and send 6-digit code.
  2. Verify code and create session.
- Signup uses a non-persistent verification flow:
  1. Request 6-digit code (`/api/auth/register`) with a 60s expiry.
  2. Verify code (`/api/auth/register/verify`) to create the account.
  3. No user row is written before successful code verification.
- Password reset uses two API steps:
  1. `POST /api/auth/password-reset/request` to send a 6-digit reset code.
  2. `POST /api/auth/password-reset/confirm` to verify code and set a new password.
- OTP/code flow is only for non-social auth.

## Required environment variables

Set these in local `.env.local` and in production secrets:

- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `AUTH_TRUST_HOST`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `AUTH_EMAIL_FROM`
- `AUTH_RATE_LIMIT_DISABLED` (set `true` to disable auth rate limits in any environment)
- `AUTH_RATE_LIMIT_DISABLE_IN_DEV` (defaults to `true`, disables auth rate limits in non-production)
- `AUTH_CODE_TTL_SECONDS` (defaults to `60`)
- `AUTH_CODE_RESEND_COOLDOWN_SECONDS` (defaults to `30`)
- `SIGNUP_CODE_TTL_SECONDS` (defaults to `60`)
- `SIGNUP_CODE_RESEND_COOLDOWN_SECONDS` (defaults to `60`)

## Google OAuth configuration

Use one client for production and one for local development (recommended).

### Authorized JavaScript origins

- `http://localhost:3000`
- `http://localhost:3001` (optional fallback if 3000 is occupied)
- `https://blastermailer.com`
- `https://www.blastermailer.com`

### Authorized redirect URIs

- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google` (optional)
- `https://blastermailer.com/api/auth/callback/google`
- `https://www.blastermailer.com/api/auth/callback/google`

## GitHub OAuth configuration

GitHub OAuth App callback URL must match the environment app:

- Local app callback: `http://localhost:3000/api/auth/callback/github`
- Production app callback: `https://blastermailer.com/api/auth/callback/github`

If you need both simultaneously, keep separate OAuth apps (local + prod), with separate env secrets.

## Local defaults

- `AUTH_URL=http://localhost:3000`
- `NEXTAUTH_URL=http://localhost:3000`
- If you run on a different port, update both values and ensure OAuth redirect URI includes that port.
- SMTP in local can use Mailpit directly: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` (used automatically as fallback in non-production).
- `npm run dev` now runs a `prisma db push` preflight automatically in local dev to avoid missing Auth.js tables (`Account`, `Session`, `VerificationToken`).
- Auth endpoints also run a local-only schema bootstrap fallback, so OAuth callbacks can recover from missing auth tables without manual SQL.

## Security notes

- Never commit OAuth secrets or SMTP passwords into git.
- Rotate compromised keys immediately.
- Keep production and local credentials isolated.
