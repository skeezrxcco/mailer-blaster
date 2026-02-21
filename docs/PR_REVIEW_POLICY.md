# PR Review Policy

## Scope

This policy applies to all pull requests targeting `dev`, `release/*`, and `main`.

## Required Review Rules

- At least 1 approval before merge.
- No unresolved review comments.
- CI checks must pass.
- `CHANGELOG.md` must be updated for release-impacting changes.

## Merge Guidance

- Prefer squash merge for feature work into `dev`.
- Use merge commit for release promotion (`release/* -> main`, `main -> dev`) to preserve release history.
- Hotfixes targeting `main` must include `release:hotfix` label.

## Labeling Requirements

- Include at least:
  - one `type:*` label,
  - one `area:*` label,
  - one release label (`release:ready`, `release:blocked`, or `release:hotfix`) when applicable.

## Ownership

- Default CODEOWNER is defined in `.github/CODEOWNERS`.
