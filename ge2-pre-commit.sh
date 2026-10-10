#!/usr/bin/env bash
# ge2-pre-commit.sh — git pre-commit hook: runs ge2-check.sh on the repo it is
# installed in, and blocks the commit on any FAIL (WARNs pass).
# It checks the working tree, not just what is staged.
#
# Install, from the repo root:
#   ge2:        ln -s ../../ge2-pre-commit.sh .git/hooks/pre-commit
#   an app:     ln -s /var/www/dash/ge2/ge2-pre-commit.sh .git/hooks/pre-commit
# Skip once:    git commit --no-verify

set -uo pipefail

here=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")
project=$(basename "$(git rev-parse --show-toplevel)")

if ! "$here/ge2-check.sh" "$project"; then
    echo >&2
    echo "pre-commit: ge2-check.sh failed for $project — fix the FAILs above, or commit with --no-verify" >&2
    exit 1
fi
