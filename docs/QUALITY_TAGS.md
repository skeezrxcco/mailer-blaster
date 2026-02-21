# Quality, Pipeline, and Release Tags

This repository uses standardized GitHub labels to improve triage, release quality, and delivery visibility.

## Type Tags

- `type:feature`
- `type:fix`
- `type:refactor`
- `type:chore`
- `type:docs`

## Area Tags

- `area:auth`
- `area:chat`
- `area:templates`
- `area:contacts`
- `area:campaigns`
- `area:billing`
- `area:infra`
- `area:data`
- `area:ui`

## Pipeline Tags

- `pipeline:ci`
- `pipeline:deploy`
- `pipeline:docker`

## Quality/Test Tags

- `quality:test`
- `quality:coverage`
- `quality:performance`

## Release Tags

- `release:ready`
- `release:blocked`
- `release:hotfix`

## Automation

- Labels are source-controlled in `.github/labels.yml`.
- Label sync workflow: `.github/workflows/labels-sync.yml`.
- PR auto-labeling by changed paths: `.github/labeler.yml` and `.github/workflows/pr-labeler.yml`.
