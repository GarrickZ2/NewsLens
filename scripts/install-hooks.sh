#!/bin/sh
# Run once after cloning: sh scripts/install-hooks.sh
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK="$REPO_ROOT/.git/hooks/pre-commit"

cp "$REPO_ROOT/scripts/pre-commit.sh" "$HOOK"
chmod +x "$HOOK"
echo "✓ pre-commit hook installed"
