# Blastermailer Codex Rules

This file defines mandatory rules for AI agents working in this repository.

## 1) Project Identity

- Canonical project name is `blastermailer`.
- Do not introduce or reintroduce old names:
  - `AI-newsletter-agent`
  - `AI-newsletter`
  - `mailer-blaster`
  - `mailerblaster`

## 2) Branching and Versioning

- Long-lived branches:
  - `main`
  - `dev`
  - `release/*`
- Work branches must be created from `dev`:
  - `feature/*`
  - `fix/*`
  - `improvement/*`
  - `refactor/*`
  - `chore/*`
- Hotfixes can target `main` directly when explicitly required.

### Release flow

1. Merge work PRs into `dev`.
2. Cherry-pick selected commits from `dev` into `release/<version>`.
3. Update `CHANGELOG.md` on every cherry-pick to `release/*`.
4. Merge `release/*` into `main` at sprint/release close.
5. Merge `main` back into `dev` immediately after release.

### Required docs to keep in sync

- `docs/VERSIONING.md`
- `CHANGELOG.md`

## 3) Architecture Rules

- Each route segment must own its page:
  - `app/<segment>/page.tsx` for server wrapper/non-client logic.
  - `app/<segment>/<segment>PageClient.tsx` for client UI logic.
- Segment data must be isolated in data files:
  - `app/<segment>/<segment>-page.data.ts` or equivalent typed data modules.
- Reusable cross-page components go in `components/shared/*`.
- Page-specific components stay inside their route segment folder.
- Reusable hooks go in `hooks/*`.
- Page-specific hooks stay in the segment folder.

### Anti-patterns (do not reintroduce)

- Monolithic page controller components serving all routes.
- `components/shared/workspace/workspace-client.tsx`.

## 4) Auth Rules

- Social auth (Google/GitHub) must remain direct OAuth flow.
- Email verification code is only for non-social credentials flow and only in step 2.
- Never hardcode secrets, tokens, SMTP passwords, or OAuth secrets in source files.

## 5) Naming and Infrastructure Rules

- Docker compose project name must be `blastermailer`.
- Docker service/container/image naming must use `blastermailer` prefix.
- Production image naming must use:
  - `skeezrxcco/blastermailer:<tag>`

## 6) Codex GitHub Shortcut Workflow

Shortcuts file:

- `scripts/blastermailer-gh-shortcuts.zsh`

Common commands:

- Create PR to `dev`:
  - `bm_pr_dev`
- Create PR to `main` (hotfix):
  - `bm_pr_hotfix` or `bm_pr_master`
- Merge a PR into `dev` and cherry-pick to release:
  - `bm_merge_dev_and_cherrypick <pr> <release_branch>`
- Promote release to `main` and sync back to `dev`:
  - `bm_promote_release <release_branch>`

## 7) Quality Gates

- Keep responsive behavior intact across mobile, tablet, and desktop.
- Preserve existing app shell/navigation behavior unless task explicitly changes it.
- Prefer minimal, focused diffs and avoid broad refactors unless requested.
- Apply or request label coverage for PRs using `.github/labels.yml` and `.github/labeler.yml`.
- Use release labels for promotion decisions:
  - `release:ready`
  - `release:blocked`
  - `release:hotfix`
