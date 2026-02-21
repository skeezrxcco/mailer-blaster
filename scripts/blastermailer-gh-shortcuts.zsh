#!/usr/bin/env zsh

# Blastermailer GitHub workflow helpers.
# Load with:
#   source ./scripts/blastermailer-gh-shortcuts.zsh

_bm_require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh CLI is not installed."
    return 1
  fi
  if ! gh auth status >/dev/null 2>&1; then
    echo "gh auth is not configured. Run bm_gh_auth first."
    return 1
  fi
}

_bm_require_clean_git() {
  if [ ! -d ".git" ]; then
    echo "Not in a git repository."
    return 1
  fi
  if ! git diff-index --quiet HEAD --; then
    echo "Working tree is not clean. Commit or stash first."
    return 1
  fi
}

_bm_remote_branch_exists() {
  local branch="$1"
  git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1
}

bm_gh_auth() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "gh CLI is not installed."
    return 1
  fi
  local token=""
  read -r -s "token?GitHub token: "
  echo
  if [ -z "$token" ]; then
    echo "Token is required."
    return 1
  fi
  printf '%s' "$token" | gh auth login -h github.com --with-token
  gh auth status
}

bm_pr() {
  local base="${1:-codex/dev}"
  local title="${2:-$(git rev-parse --abbrev-ref HEAD)}"
  local body="${3:-}"

  _bm_require_gh || return 1
  _bm_require_clean_git || return 1

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$current_branch" = "$base" ]; then
    echo "Current branch equals base branch ($base)."
    return 1
  fi

  if ! _bm_remote_branch_exists "$current_branch"; then
    echo "Pushing branch $current_branch to origin..."
    git push -u origin "$current_branch" || return 1
  fi

  gh pr create \
    --base "$base" \
    --head "$current_branch" \
    --title "$title" \
    --body "$body" \
    --assignee "@me" \
    --draft=false
}

bm_pr_hotfix() {
  bm_pr "main" "${1:-hotfix: $(git rev-parse --abbrev-ref HEAD)}" "${2:-}"
}

bm_pr_master() {
  bm_pr_hotfix "$@"
}

bm_pr_dev() {
  bm_pr "codex/dev" "${1:-dev: $(git rev-parse --abbrev-ref HEAD)}" "${2:-}"
}

bm_merge_pr() {
  local pr="$1"
  local method="${2:-squash}" # merge | squash | rebase
  if [ -z "$pr" ]; then
    echo "Usage: bm_merge_pr <pr_number_or_url> [merge|squash|rebase]"
    return 1
  fi

  _bm_require_gh || return 1

  case "$method" in
    merge) gh pr merge "$pr" --merge --delete-branch ;;
    rebase) gh pr merge "$pr" --rebase --delete-branch ;;
    *) gh pr merge "$pr" --squash --delete-branch ;;
  esac
}

bm_merge_main() {
  bm_merge_pr "$1" "${2:-merge}"
}

bm_merge_master() {
  bm_merge_main "$@"
}

bm_merge_dev() {
  bm_merge_pr "$1" "${2:-squash}"
}

bm_cherrypick_to_release() {
  local pr="$1"
  local release_branch="$2"

  if [ -z "$pr" ] || [ -z "$release_branch" ]; then
    echo "Usage: bm_cherrypick_to_release <pr_number_or_url> <release_branch>"
    return 1
  fi

  _bm_require_gh || return 1
  _bm_require_clean_git || return 1

  local base_ref
  base_ref="$(gh pr view "$pr" --json baseRefName --jq '.baseRefName')" || return 1
  if [ "$base_ref" != "codex/dev" ]; then
    echo "PR base is $base_ref, expected codex/dev."
    return 1
  fi

  local merge_sha
  merge_sha="$(gh pr view "$pr" --json mergeCommit --jq '.mergeCommit.oid')" || return 1
  if [ -z "$merge_sha" ] || [ "$merge_sha" = "null" ]; then
    echo "PR is not merged yet (no merge commit)."
    return 1
  fi

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"

  git fetch origin || return 1
  git checkout "$release_branch" || return 1
  git pull --rebase origin "$release_branch" || return 1
  git cherry-pick -x "$merge_sha" || return 1
  git push origin "$release_branch" || return 1
  git checkout "$current_branch" || return 1
}

bm_merge_dev_and_cherrypick() {
  local pr="$1"
  local release_branch="$2"
  local method="${3:-squash}"

  if [ -z "$pr" ] || [ -z "$release_branch" ]; then
    echo "Usage: bm_merge_dev_and_cherrypick <pr_number_or_url> <release_branch> [merge|squash|rebase]"
    return 1
  fi

  bm_merge_pr "$pr" "$method" || return 1
  bm_cherrypick_to_release "$pr" "$release_branch"
}

bm_promote_release() {
  local release_branch="$1"
  local main_branch="${2:-main}"
  local dev_branch="${3:-codex/dev}"

  if [ -z "$release_branch" ]; then
    echo "Usage: bm_promote_release <release_branch> [main_branch] [dev_branch]"
    return 1
  fi

  _bm_require_clean_git || return 1

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"

  git fetch origin || return 1

  git checkout "$main_branch" || return 1
  git pull --rebase origin "$main_branch" || return 1
  git merge --no-ff "$release_branch" -m "chore(release): merge $release_branch into $main_branch" || return 1
  git push origin "$main_branch" || return 1

  git checkout "$dev_branch" || return 1
  git pull --rebase origin "$dev_branch" || return 1
  git merge --no-ff "$main_branch" -m "chore(sync): merge $main_branch into $dev_branch" || return 1
  git push origin "$dev_branch" || return 1

  git checkout "$current_branch" || return 1
}

bm_promote_release_master() {
  bm_promote_release "$1" "main" "codex/dev"
}

bm_pr_checks() {
  local pr="$1"
  if [ -z "$pr" ]; then
    echo "Usage: bm_pr_checks <pr_number_or_url>"
    return 1
  fi
  _bm_require_gh || return 1
  gh pr checks "$pr"
}

bm_ci_watch() {
  _bm_require_gh || return 1
  gh run watch
}
