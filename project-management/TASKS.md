# TASKS

Last updated: 2026-02-20

## 0) Delivery Baseline

- [x] Define route map and user journey (`/login`, `/signup`, `/chat`, `/templates`, `/contacts`, `/activity`, `/campaigns`, `/settings`, `/pricing`, `/checkout`)
- [x] Add Docker-based local infrastructure (Postgres, Redis, NATS, Mailpit, Ollama)
- [x] Add Makefile-driven local operations
- [x] Add CI workflow for checks on every branch push
- [x] Add deployment workflow for production deploy on `main`
- [ ] Add branch protection rules requiring checks before merge to `main`
- [ ] Add CODEOWNERS and PR review policy

## 1) Product and UX Scope

- [ ] Finalize IA and navigation behavior for desktop/tablet/mobile
- [ ] Lock design system tokens (colors, spacing, typography, radii, elevation, motion)
- [x] Remove duplicated page title patterns and ensure consistent subtle descriptions
- [ ] Add global loading, empty, error, and offline states for all pages
- [ ] Add a11y pass (keyboard nav, ARIA labels, focus order, contrast)
- [ ] Add i18n structure (at least EN/PT support scaffolding)

## 2) Authentication and Sessions

- [x] Implement credential auth routes (`register`, `send-code`, `logout`, NextAuth route)
- [x] Implement 6-digit verification code generation and validation model
- [x] Add email provider abstraction (Resend and SMTP fallback)
- [x] Support local SMTP flow with Mailpit for dev
- [ ] Implement password reset flow with email verification code
- [ ] Implement social auth provider callback hardening and account linking rules
- [ ] Enforce secure session cookie flags by environment
- [ ] Add rate limiting and abuse controls for login/register/send-code
- [ ] Add session invalidation on password change and suspicious auth events

## 3) Data Model and Persistence

- [x] Add Prisma schema core entities (users, auth codes, contacts, campaigns, jobs, messages, email messages)
- [x] Add Prisma client generation in dev runtime
- [ ] Convert `db push` flows to migration-first strategy for production
- [ ] Add seed script for plans, template catalog, and baseline settings
- [ ] Add DB constraints and indexes audit for campaign/contact scale
- [ ] Add soft-delete strategy and retention policy where needed
- [ ] Add backup/restore runbook for production database

## 4) AI Chat Orchestration

- [x] Add AI provider abstraction with OpenAI/Ollama auto fallback
- [ ] Do not persist chat threads and messages on this DB only of the AI provider does not persist them (not only ephemeral)
- [ ] Implement chat workflow state machine persistence and resume
- [ ] Add bot typing streaming with token-by-token server events
- [ ] Add model routing policies by plan/tier/cost budget
- [ ] Add prompt templates and guardrails for newsletter generation
- [ ] Add moderation/safety checks for generated content
- [ ] Add AI request telemetry (latency, cost, failures, model usage)

## 5) Templates and Editor

- [x] Keep template catalog split by marketplace and my templates
- [x] Add local my-templates persistence hook
- [x] Support template preview modal and selection CTA flow
- [ ] Replace local my-templates with backend ownership records
- [ ] Implement pro-gated template access using entitlement API
- [ ] Implement full inline editor persistence with version history
- [ ] Add image-edit modal flow (upload/url/AI generation) persisted server-side
- [ ] Add drag-and-drop section reorder persistence
- [ ] Add template autosave and conflict resolution for multi-tab editing
- [ ] Add template publish/unpublish and duplication APIs

## 6) Contacts Module

- [x] CRUD contacts UI baseline
- [x] Modal-based contact add flow with manual and CSV modes
- [x] Inline row edit/remove interactions
- [ ] Move contacts data to backend APIs with pagination and server search
- [ ] Implement CSV ingestion worker with robust parsing and error report
- [ ] Add duplicate policies (workspace-level and list-level options)
- [ ] Add bulk actions (tag, unsubscribe, delete, export)
- [ ] Add contact activity history timeline
- [ ] Add import job status tracking and downloadable import report

## 7) Campaigns and Activity

- [x] Activity page shell and status visualization
- [ ] Implement campaign creation API from chat/template flow
- [ ] Queue send jobs asynchronously (no request blocking)
- [ ] Add recipient-level delivery statuses and retries
- [ ] Add schedule campaigns with timezone support
- [ ] Add cancel/pause/resume queue controls
- [ ] Add real-time progress updates (SSE/WebSocket) with polling fallback
- [ ] Add campaign events audit log and replay-safe idempotency keys
- [ ] Add KPI aggregation (sent, delivered, open, click, bounce, fail)

## 8) Messaging and Jobs Infrastructure

- [x] Add NATS and Redis local infra
- [x] Add jobs and messaging library scaffolding
- [ ] Implement queue worker process topology (scheduler, sender, retryer)
- [ ] Add dead-letter queue and poison-message handling
- [ ] Add exponential backoff retry strategy with max-attempt policies
- [ ] Add job deduplication and idempotency safeguards
- [ ] Add worker health probes and queue depth metrics
- [ ] Add outbox pattern for reliable event publication

## 9) Billing, Plans, and Entitlements

- [x] Checkout item type supports templates and add-ons
- [ ] Remove legacy price labels in templates and enforce `pro` label behavior
- [ ] Implement billing catalog API and plan metadata management
- [ ] Implement Stripe checkout session creation and return URLs
- [ ] Implement Stripe webhook ingestion and signature verification
- [ ] Persist subscription, invoices, payment status, and failed payment handling
- [ ] Enforce entitlements server-side for pro-only features (`campaigns`, pro templates)
- [ ] Add upgrade/downgrade proration policy handling
- [ ] Add usage/credit counters and overage/add-on consumption logic

## 10) Settings and Integrations

- [x] Settings page with profile/plan/usage/referrals sections
- [ ] Persist profile and workspace settings to backend
- [ ] Add SMTP integration persistence with encryption at rest
- [ ] Add SMTP test-send and validation endpoint
- [ ] Add API keys management for plugin integrations
- [ ] Add referral tracking backend and rewards policy
- [ ] Add usage chart API endpoints and retention policies

## 11) API and Security Hardening

- [ ] Add centralized request validation schemas for all endpoints
- [ ] Add structured error taxonomy and user-safe error mapping
- [ ] Add API authentication middleware with capability checks
- [ ] Add rate limiting per IP/user/endpoint class
- [ ] Add CSRF and origin protection where applicable
- [ ] Add secrets hygiene checks and environment validation at boot
- [ ] Add PII masking rules in logs and traces
- [ ] Add audit logs for auth, billing, campaign send, and settings changes

## 12) Observability and Operations

- [ ] Add structured logging and correlation IDs across API and workers
- [ ] Add metrics export (request latency, queue depth, worker success/fail)
- [ ] Add tracing for critical flows (auth, send, billing, AI generation)
- [ ] Add alerting runbooks for queue backlog, send failure spikes, webhook failures
- [ ] Add health endpoints for app, db, queue, worker
- [ ] Add SLO definitions and error budget policy
- [ ] Add incident response playbook and on-call checklist

## 13) Testing and Quality Gates

- [ ] Add unit tests for auth code, email provider selection, and validation logic
- [ ] Add integration tests for auth/register/send-code/logout
- [ ] Add integration tests for contacts CRUD and CSV import
- [ ] Add integration tests for campaign queue lifecycle
- [ ] Add E2E tests for main journey (signup -> template -> contacts -> confirm -> activity)
- [ ] Add E2E tests for pro gating and checkout flow
- [ ] Add fixture strategy and isolated test database setup
- [ ] Enforce minimum coverage threshold in CI

## 14) Deployment and Environments

- [x] CI checks on any branch push
- [x] Production deploy workflow on push to `main`
- [ ] Configure Vercel project with required secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
- [ ] Configure production managed services (DB, Redis, queue/messaging, SMTP, object storage)
- [ ] Configure preview/staging environment and seed data
- [ ] Add smoke tests post-deploy
- [ ] Add rollback plan and deployment freeze protocol

## 15) Vercel Platform Constraints and Architecture Decisions

- [x] Keep Next.js app deployable on Vercel
- [x] Keep stateful infra external to Vercel runtime (Postgres, Redis, queue, SMTP, AI runtime)
- [ ] Decide production hosting for workers and realtime gateway (separate service or container platform)
- [ ] Decide production AI strategy (paid model primary, local/free fallback policy)
- [ ] Document cost guardrails per environment and per feature

## 16) Documentation and Handover

- [x] Maintain backend context document (`docs/BACKEND_AGENT_CONTEXT.md`)
- [ ] Add API contract docs (OpenAPI or equivalent)
- [ ] Add architecture diagram (app, workers, queue, billing, AI provider routing)
- [ ] Add runbooks for local setup, migration, release, and incident handling
- [ ] Add contributor guide for CI, coding standards, and testing
