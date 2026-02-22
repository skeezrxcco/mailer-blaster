# Blastermailer Git/GitHub Commands

Load shortcuts:

```bash
source ./scripts/blastermailer-gh-shortcuts.zsh
```

This workflow intentionally standardizes only three commands: `ghpr`, `ghm`, `ghcp`.

## `ghpr`

- Prompts for branch name and optional ticket.
- Creates branch from current branch.
- Creates an initial empty commit.
- Pushes branch to origin.
- Opens a PR with base set to the branch you started from.

## `ghm`

- Interactive merge command.
- Prompts to select:
  - source branch
  - target branch
- Executes merge and push.
- Prompts whether to delete source branch after merge.
- Default delete answer is yes.

## `ghcp`

- Cherry-picks commits from a selected source branch into current branch.
- Prompts for source branch.
- Prompts for mode:
  - select commits (multi-select)
  - all commits
- Applies commits in order with `git cherry-pick -x`.

## Notes

- If `fzf` is installed, branch/commit selection uses a rich interactive picker.
- Without `fzf`, commands fall back to clean numbered prompts.
- Keep working tree clean before `ghm` and `ghcp`.
