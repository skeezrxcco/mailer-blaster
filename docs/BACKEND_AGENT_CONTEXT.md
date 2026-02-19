# AI Newsletter Agent - Backend Context

Last updated: 2026-02-19

## 1) Product Scope

This app is a multi-page workspace to create newsletter campaigns with AI-assisted template selection, inline template editing, recipient validation, campaign queue handoff, analytics views, and billing flows.

Primary user journey:

1. User authenticates (email/password or social provider).
2. User generates/selects a template in chat or template library.
3. User edits template inline (copy + images + drag/reorder sections).
4. User submits recipients (manual input or CSV import).
5. User validates recipients and confirms send.
6. App redirects to activity/campaign tracking.
7. User can manage contacts, plan, add-ons, checkout, and pro campaigns.

## 2) Current Frontend Stack

- Next.js App Router
- React client components
- Tailwind + shadcn/ui components
- Recharts for usage analytics
- Local in-memory auth store (`lib/auth-store.ts`)
- LocalStorage checkout cart (`hooks/use-checkout-item.ts`)

## 3) Route Map

- `/login` and `/signup`: authentication pages
- `/chat`: AI chat orchestration page (main workflow)
- `/templates`: template discovery + preview + editor modal
- `/contacts`: contact management + CSV import + table
- `/activity`: campaign delivery/progress + history
- `/campaigns`: pro-only campaign operations/KPI center
- `/settings`: profile/plan/usage/referrals sections
- `/pricing`: monthly/annual plans + add-ons
- `/checkout`: payment summary and checkout screen

## 4) Auth and Session Behavior

Current behavior:

- Session cookie name: `session-token`
- Middleware protects workspace routes and redirects unauthenticated users to `/login`.
- Auth pages redirect authenticated users to `/chat`.
- API routes:
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `POST /api/auth/social` (`google` or `github`)
  - `POST /api/auth/logout`

Current storage is in-memory only (`lib/auth-store.ts`), so sessions/users are not persistent across server restarts.

## 5) Core Entities to Implement in Backend

- `User`: identity, provider, plan, profile settings
- `Session`: token, expiry, user reference
- `Workspace`: tenant/team container (future-ready)
- `Template`: metadata, pricing, domain/category, preview assets
- `TemplateVersion`: editable template content snapshot
- `Contact`: email, name, status, source, timestamps
- `ContactList` (optional): logical recipient groups
- `Campaign`: draft/scheduled/queued/processing/sent/failed states
- `CampaignRecipient`: per-email delivery status
- `SendJob` / queue task: async sending lifecycle
- `UsageLedger`: credit and send consumption records
- `Plan` and `Addon`: pricing catalog
- `CheckoutSession` and `Payment`: billing status history
- `Integration`: SMTP and plugin configuration

## 6) Chat Workflow (State Machine)

Observed front-end states:

- Prompt mode: user describes campaign goal.
- Suggestion mode: app shows template suggestion cards.
- Template review mode: selected template with actions (`Edit`, `Change`, `Continue`).
- Email request mode: input accepts emails and CSV upload.
- Validation mode: shows total/valid/invalid/duplicate recipients, allows edit/remove.
- Confirm send: creates campaign id and redirects to `/activity` with query params.

Backend should expose stateful endpoints so this flow is recoverable after refresh and across devices.

## 7) Template System Behavior

Template dataset is currently static in `components/shared/newsletter/template-data.ts`.

Capabilities already present in UI:

- Multi-domain template catalog
- Search/filter/sort on template library
- Template preview modal with desktop/tablet/mobile viewport toggles
- Inline editing in template editor:
  - Editable text blocks
  - Image replacement by upload, URL, or AI-generated URL
  - Drag/drop dish blocks (reorder)
- Hover-based mini-preview auto scroll in cards
- Library labels (examples): `NEW`, `DISCOUNT`, `REDUCED`

Backend should return template cards + full editable template payload separately.

## 8) Recipient Input and Validation

Supported input:

- Manual emails in chat input
- CSV upload (requires `email` header column)

Validation handled on client today:

- Syntax validation
- Duplicate detection
- Editable invalid entries
- Removal of invalid rows

Backend should own canonical validation and return structured results per row:

- `status`: valid | invalid | duplicate
- `reason`: invalid_format | missing | duplicate_in_file | duplicate_in_workspace

## 9) Campaign Sending and Activity

Current activity page simulates queue progress and status transitions.

Backend target behavior:

- Create campaign in `queued`
- Enqueue async send tasks
- Update campaign progress (`queued -> processing -> sent/failed`)
- Persist recipient-level events
- Expose real-time progress:
  - polling endpoint and/or
  - SSE/WebSocket stream

## 10) Contacts Module

Current UI supports:

- Add contact manually
- CSV import
- Search contacts
- Delete contact
- Display list in table with source/status/date

Backend needed:

- CRUD endpoints
- Bulk CSV ingestion endpoint
- Duplicate handling rules
- Unsubscribe status management

## 11) Plans, Pricing, Checkout

Current behavior:

- Pricing page supports monthly/annual switch and add-ons.
- Checkout item is stored in LocalStorage.
- Checkout page conditionally renders empty state when no item exists.
- Settings `Plan` section can push items to checkout.

Backend should provide:

- Catalog endpoints (plans/add-ons/prices)
- Checkout session creation (Stripe recommended)
- Webhook processing for payment events
- Subscription and entitlement sync

## 12) Pro Gating and Entitlements

Current pro logic is front-end only (`workspaceStaticData.user.plan === "pro"`), used to gate:

- `Campaigns` nav item/page
- advanced management workflows

Backend must enforce entitlements server-side and return capability flags for UI.

## 13) Settings and Integrations

Settings sections:

- Profile
- Plan
- Usage
- Referals

Existing features:

- Usage charts + usage limit visual
- Plan add-on entry points
- Custom SMTP add-on trigger

Backend targets:

- Persist profile/brand defaults
- Persist SMTP config securely (encrypted at rest)
- Store usage counters and time-series metrics

## 14) Existing Generation APIs

The repository contains media generation endpoints already:

- `/api/generate-image`
- `/api/generate-moment-image`
- `/api/generate-storyboard`
- `/api/generate-video`
- `/api/upload-image`

These can be integrated with campaign/template workflows, but they are currently separate from persistent backend domain models.

## 15) Current Temporary Storage to Replace

- In-memory auth/session store in `lib/auth-store.ts`
- Static template/contact/campaign data files
- LocalStorage checkout item
- Query param based activity state handoff

Replace with database-backed models + authenticated APIs.

## 16) Suggested Backend API Surface (Initial)

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/social`
- `POST /auth/logout`
- `GET /me`
- `GET /templates`
- `GET /templates/:id`
- `POST /templates/:id/render`
- `POST /campaigns`
- `GET /campaigns`
- `GET /campaigns/:id`
- `GET /campaigns/:id/events`
- `POST /campaigns/:id/schedule`
- `POST /campaigns/:id/send`
- `GET /contacts`
- `POST /contacts`
- `POST /contacts/import`
- `PATCH /contacts/:id`
- `DELETE /contacts/:id`
- `GET /billing/catalog`
- `POST /billing/checkout-session`
- `POST /billing/webhooks/stripe`
- `GET /usage/summary`
- `GET /usage/timeseries`
- `GET /integrations`
- `POST /integrations/smtp`

## 17) Critical Implementation Notes for Backend Agent

- Preserve current UX contracts (chat phases, template editor behavior, activity redirect flow).
- Add idempotency keys for send/schedule operations.
- Sending must be queue-based; do not block request cycle on delivery.
- Provide campaign progress granularity for live UI updates.
- Keep CSV ingestion tolerant to delimiter/quoting variants.
- Enforce plan limits and quota checks server-side.
- Keep compatibility with existing `TemplateOption` and `TemplateEditorData` shape while migrating.
