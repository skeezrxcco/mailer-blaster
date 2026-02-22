#!/usr/bin/env zsh

# Blastermailer Git workflow shortcuts.
# Load with:
#   source ./scripts/blastermailer-gh-shortcuts.zsh

setopt local_options no_nomatch

_bm_color() {
  local code="$1"
  printf "\033[%sm" "$code"
}

_bm_reset() {
  _bm_color "0"
}

_bm_info() {
  _bm_color "36"
  printf "info: %s\n" "$1"
  _bm_reset
}

_bm_ok() {
  _bm_color "32"
  printf "ok: %s\n" "$1"
  _bm_reset
}

_bm_warn() {
  _bm_color "33"
  printf "warn: %s\n" "$1"
  _bm_reset
}

_bm_err() {
  _bm_color "31"
  printf "error: %s\n" "$1"
  _bm_reset
}

_bm_require_git_repo() {
  if [ ! -d ".git" ]; then
    _bm_err "Not inside a git repository."
    return 1
  fi
}

_bm_require_gh_auth() {
  if ! command -v gh >/dev/null 2>&1; then
    _bm_err "GitHub CLI (gh) is not installed."
    return 1
  fi
  if ! gh auth status >/dev/null 2>&1; then
    _bm_err "gh auth is not configured. Run: gh auth login"
    return 1
  fi
}

_bm_require_clean_tree() {
  if ! git diff-index --quiet HEAD --; then
    _bm_err "Working tree is not clean. Commit or stash changes first."
    return 1
  fi
}

_bm_prompt_text() {
  local label="$1"
  local default_value="${2:-}"
  local value=""
  if [ -n "$default_value" ]; then
    read "value?$label [$default_value]: "
    value="${value:-$default_value}"
  else
    read "value?$label: "
  fi
  printf "%s" "$value"
}

_bm_confirm() {
  local prompt="$1"
  local default_yes="${2:-yes}"
  local answer=""

  if [ "$default_yes" = "yes" ]; then
    read "answer?$prompt [Y/n]: "
    answer="${answer:l}"
    [[ -z "$answer" || "$answer" = "y" || "$answer" = "yes" ]]
  else
    read "answer?$prompt [y/N]: "
    answer="${answer:l}"
    [[ "$answer" = "y" || "$answer" = "yes" ]]
  fi
}

_bm_select_one() {
  local label="$1"
  local default_value="$2"
  shift 2
  local options=("$@")

  if [ "${#options[@]}" -eq 0 ]; then
    _bm_err "No options available for $label."
    return 1
  fi

  local selected=""
  if command -v fzf >/dev/null 2>&1; then
    selected="$(printf "%s\n" "${options[@]}" | fzf --height 40% --layout reverse --prompt "$label > " --select-1 --exit-0)"
    if [ -n "$selected" ]; then
      printf "%s" "$selected"
      return 0
    fi
  fi

  _bm_info "$label:"
  local idx=1
  local default_index=1
  for option in "${options[@]}"; do
    if [ "$option" = "$default_value" ]; then
      default_index="$idx"
    fi
    printf "  %d) %s\n" "$idx" "$option"
    idx=$((idx + 1))
  done

  local input=""
  read "input?Choose [${default_index}]: "
  input="${input:-$default_index}"
  if [[ ! "$input" =~ '^[0-9]+$' ]]; then
    _bm_err "Invalid selection."
    return 1
  fi
  local picked="${options[$input]}"
  if [ -z "$picked" ]; then
    _bm_err "Selection out of range."
    return 1
  fi
  printf "%s" "$picked"
}

_bm_select_many_commits() {
  local source_branch="$1"
  local target_branch="$2"

  local commits
  commits="$(git log --reverse --oneline "${target_branch}..${source_branch}")"
  if [ -z "$commits" ]; then
    _bm_warn "No commits found to cherry-pick from $source_branch into $target_branch."
    return 1
  fi

  local selected=""
  if command -v fzf >/dev/null 2>&1; then
    selected="$(printf "%s\n" "$commits" | fzf -m --height 50% --layout reverse --prompt "commits > ")"
    if [ -n "$selected" ]; then
      printf "%s\n" "$selected" | awk '{print $1}'
      return 0
    fi
  fi

  _bm_info "Available commits:"
  local lines
  lines=("${(@f)commits}")
  local i=1
  for line in "${lines[@]}"; do
    printf "  %d) %s\n" "$i" "$line"
    i=$((i + 1))
  done
  local answer=""
  read "answer?Pick commit numbers (comma-separated) or 'all': "
  answer="${answer:l}"

  if [ "$answer" = "all" ]; then
    printf "%s\n" "$commits" | awk '{print $1}'
    return 0
  fi

  local picks=("${(@s:,:)answer}")
  local sha_list=()
  for pick in "${picks[@]}"; do
    pick="${pick//[[:space:]]/}"
    if [[ ! "$pick" =~ '^[0-9]+$' ]]; then
      continue
    fi
    local line="${lines[$pick]}"
    if [ -n "$line" ]; then
      sha_list+=("$(printf "%s" "$line" | awk '{print $1}')")
    fi
  done

  if [ "${#sha_list[@]}" -eq 0 ]; then
    _bm_err "No valid commit selection."
    return 1
  fi
  printf "%s\n" "${sha_list[@]}"
}

ghpr() {
  _bm_require_git_repo || return 1
  _bm_require_gh_auth || return 1

  local base_branch
  base_branch="$(git rev-parse --abbrev-ref HEAD)"
  local branch_name
  branch_name="$(_bm_prompt_text "Branch name")"
  if [ -z "$branch_name" ]; then
    _bm_err "Branch name is required."
    return 1
  fi
  branch_name="${branch_name:l}"
  branch_name="${branch_name// /-}"

  local ticket
  ticket="$(_bm_prompt_text "Ticket (optional)")"

  git checkout -b "$branch_name" || return 1
  git commit --allow-empty -m "Initial commit for $branch_name" || return 1
  git push -u origin "$branch_name" || return 1

  local pr_body="${ticket:+Ticket: $ticket}"
  gh pr create \
    --base "$base_branch" \
    --head "$branch_name" \
    --title "$branch_name" \
    --body "$pr_body" \
    --assignee "@me" \
    --draft=false
}

ghm() {
  _bm_require_git_repo || return 1
  _bm_require_clean_tree || return 1

  git fetch origin --prune >/dev/null 2>&1

  local branches
  branches=("${(@f)$(git for-each-ref --format='%(refname:short)' refs/heads | sort)}")
  if [ "${#branches[@]}" -eq 0 ]; then
    _bm_err "No local branches found."
    return 1
  fi

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"

  local source_branch
  source_branch="$(_bm_select_one "Select source branch to merge" "$current_branch" "${branches[@]}")" || return 1

  local target_options=()
  local branch
  for branch in "${branches[@]}"; do
    if [ "$branch" != "$source_branch" ]; then
      target_options+=("$branch")
    fi
  done
  local target_default="main"
  if [[ ! " ${target_options[*]} " =~ " $target_default " ]]; then
    target_default="${target_options[1]}"
  fi
  local target_branch
  target_branch="$(_bm_select_one "Select target branch" "$target_default" "${target_options[@]}")" || return 1

  _bm_info "Merge plan: $source_branch -> $target_branch"
  if ! _bm_confirm "Continue merge?" "yes"; then
    _bm_warn "Merge canceled."
    return 0
  fi

  git checkout "$target_branch" || return 1
  git pull --rebase origin "$target_branch" || return 1
  git merge --no-ff "$source_branch" -m "chore(merge): $source_branch into $target_branch" || return 1
  git push origin "$target_branch" || return 1
  _bm_ok "Merged $source_branch into $target_branch and pushed."

  if _bm_confirm "Delete source branch '$source_branch' locally and remotely?" "yes"; then
    if [ "$source_branch" != "$target_branch" ]; then
      git branch -d "$source_branch" >/dev/null 2>&1 || git branch -D "$source_branch" >/dev/null 2>&1
      git push origin --delete "$source_branch" >/dev/null 2>&1 || true
      _bm_ok "Deleted branch $source_branch."
    fi
  fi
}

ghcp() {
  _bm_require_git_repo || return 1
  _bm_require_clean_tree || return 1

  local target_branch
  target_branch="$(git rev-parse --abbrev-ref HEAD)"
  git fetch origin --prune >/dev/null 2>&1

  local source_candidates
  source_candidates=("${(@f)$(git for-each-ref --format='%(refname:short)' refs/heads | sort)}")
  local filtered=()
  local b
  for b in "${source_candidates[@]}"; do
    if [ "$b" != "$target_branch" ]; then
      filtered+=("$b")
    fi
  done
  if [ "${#filtered[@]}" -eq 0 ]; then
    _bm_err "No source branches available."
    return 1
  fi

  local source_branch
  source_branch="$(_bm_select_one "Cherry-pick from branch" "${filtered[1]}" "${filtered[@]}")" || return 1

  local mode_choice=""
  if command -v fzf >/dev/null 2>&1; then
    mode_choice="$(printf "%s\n" "select commits" "all commits" | fzf --height 30% --layout reverse --prompt "Mode > " --select-1 --exit-0)"
  fi
  if [ -z "$mode_choice" ]; then
    _bm_info "Cherry-pick mode:"
    printf "  1) select commits\n"
    printf "  2) all commits\n"
    read "mode_choice?Choose [1]: "
    case "${mode_choice:-1}" in
      2) mode_choice="all commits" ;;
      *) mode_choice="select commits" ;;
    esac
  fi

  local shas=()
  if [ "$mode_choice" = "all commits" ]; then
    shas=("${(@f)$(git log --reverse --format='%H' "${target_branch}..${source_branch}")}")
  else
    shas=("${(@f)$(_bm_select_many_commits "$source_branch" "$target_branch")}")
  fi

  if [ "${#shas[@]}" -eq 0 ]; then
    _bm_warn "No commits selected."
    return 0
  fi

  _bm_info "Cherry-picking ${#shas[@]} commit(s) into $target_branch"
  local sha
  for sha in "${shas[@]}"; do
    _bm_info "cherry-pick $sha"
    if ! git cherry-pick -x "$sha"; then
      _bm_err "Cherry-pick failed for $sha. Resolve conflicts and continue manually."
      return 1
    fi
  done

  _bm_ok "Cherry-pick completed into $target_branch."
}

