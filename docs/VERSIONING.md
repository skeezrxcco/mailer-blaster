# Versioning and Branching Strategy

## Branch roles

- `main`: production-ready code only.
- `dev`: integration branch for daily feature work.
- `release/mvp-1-0`: sprint release branch cut from `main`.
- `feature/*`, `fix/*`, `improvement/*`, `refactor/*`, `chore/*`: short-lived branches cut from `dev`.

## Sprint workflow

1. Create release branch from `main` at sprint start:
   - `git checkout main && git pull`
   - `git checkout -b release/mvp-1-0`
   - `git push -u origin release/mvp-1-0`
2. Create work branches from `dev`, open PRs into `dev`, and merge there first.
3. Promote selected commits from `dev` to `release/mvp-1-0` with `cherry-pick`.
4. For every cherry-pick to release, update `/CHANGELOG.md` in the same PR.
5. At sprint close, merge `release/mvp-1-0` into `main` and tag the release.
6. Immediately merge `main` back into `dev` to keep branches aligned.

## Recommended improvements

- Use semantic version tags on `main` (`v1.0.0`, `v1.0.1`, etc.).
- Require CI green checks before merging into `dev`, `release/*`, or `main`.
- Freeze release branch to fixes only after code-freeze date.
- Keep cherry-picks small and one concern per commit to reduce conflicts.

## Commit and branch naming conventions

- Branches:
  - `feature/<scope>`
  - `fix/<scope>`
  - `improvement/<scope>`
  - `refactor/<scope>`
  - `chore/<scope>`
- Commit examples:
  - `feat(auth): add 2-step email verification`
  - `fix(chat): preserve template selection on retry`
  - `chore(release): update changelog for otp fixes`

## Changelog rules

- File: `/CHANGELOG.md`
- Update only through PRs.
- Every release cherry-pick must include a changelog entry.
- Keep entries user-facing and grouped by:
  - `Added`
  - `Changed`
  - `Fixed`
  - `Removed`
