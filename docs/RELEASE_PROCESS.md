# Release Process

## Branch Strategy

- Development integration branch: `dev`
- Release branches: `release/vX.Y.Z` (recommended)
- Production branch: `main`

## Standard Flow

1. Merge work branches into `dev`.
2. Cherry-pick selected commits from `dev` to `release/v<version>`.
3. Update `CHANGELOG.md` for each cherry-pick to release.
4. Merge `release/v<version>` into `main`.
5. Merge `main` back into `dev`.

## Tag and Publish

### Automatic (recommended)

If merge commit message contains `release/vX.Y.Z`, workflow
`.github/workflows/auto-tag-release-merge.yml` creates and pushes `vX.Y.Z`.
Then `.github/workflows/release-tag.yml` publishes the GitHub Release.

### Manual fallback

Use this when release branch naming is not semver:

1. Create annotated tag:
   - `git tag -a v1.0.0 -m "Release v1.0.0"`
2. Push tag:
   - `git push origin v1.0.0`

This triggers `.github/workflows/release-tag.yml`, which:

- runs checks,
- extracts release notes from `CHANGELOG.md`,
- publishes a GitHub Release.

## Release Quality Checklist

- [ ] CI checks are green
- [ ] PR labels include release and quality context
- [ ] `CHANGELOG.md` updated
- [ ] No blocking labels (`release:blocked`)
