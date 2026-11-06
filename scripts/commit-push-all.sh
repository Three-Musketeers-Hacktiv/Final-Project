#!/usr/bin/env bash
# Stage semua perubahan relevan, commit, push branch aktif.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$ROOT" ]] || { echo "Error: not a git repo" >&2; exit 1; }
cd "$ROOT"

MSG="${1:-chore: sync project docs and remaining files}"
DRY="${2:-}"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || { echo "Error: detached HEAD" >&2; exit 1; }

echo "Branch : $branch"
echo "Message: $MSG"

git status -sb

# Stage everything except ignored files
git add -A

# Safety: never stage zip/env if somehow tracked intent wrong
git reset HEAD -- docs/database.zip 2>/dev/null || true
git reset HEAD -- .env .env.* 2>/dev/null || true

if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi

echo
echo "Staged files:"
git diff --cached --name-only

if [[ "$DRY" == "--dry-run" ]]; then
  echo "(dry-run) skip commit/push"
  exit 0
fi

git commit -m "$(cat <<MSG
${MSG}
MSG
)"

git push -u origin "$branch"
git status -sb
echo "Done."
