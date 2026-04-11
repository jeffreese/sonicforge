#!/usr/bin/env bash
#
# finalize-composition.sh — atomic final-step for the composition draft-first
# workflow. Copies a validated draft from /tmp/ to compositions/, then runs the
# composition-index update script so the index.json and snapshot.txt stay
# current without depending on the PostToolUse hook matcher.
#
# Why this exists: the PostToolUse hook in .claude/settings.json matches on
# Claude's `Write` tool only. Shell-side writes (cp, file movers, generator
# scripts piping to stdout, large compositions that can't reasonably be piped
# through Write) all bypass the hook. This helper runs the same update script
# the hook would have run, so the path is uniform regardless of who does the
# final write. See ADR-012 and .claude/rules/composition-drafts.md for the
# full design rationale.
#
# Usage:
#   pnpm finalize-composition <slug>
#
#   Reads /tmp/composition-draft-<slug>.json, copies it to
#   compositions/<slug>.json, and runs the composition-index update.
#
# Exit codes:
#   0 — success
#   1 — missing/invalid argument, missing draft, or missing compiled update.js
#   2 — cp failed (filesystem error, permissions, etc.)
#   3 — composition-index update.js failed (schema error, bad draft, etc.)
#
set -euo pipefail

slug="${1:-}"
if [[ -z "$slug" ]]; then
  echo "error: missing slug argument" >&2
  echo "usage: pnpm finalize-composition <slug>" >&2
  exit 1
fi

# Resolve paths relative to the repo root. pnpm run always invokes scripts
# from the package root, so $PWD here is the repo root and these relative
# paths are stable.
draft="/tmp/composition-draft-${slug}.json"
final="compositions/${slug}.json"
dist="tools/composition-index/dist/update.js"

if [[ ! -f "$draft" ]]; then
  echo "error: draft not found at $draft" >&2
  echo "hint: author the composition to this path first, per .claude/rules/composition-drafts.md" >&2
  exit 1
fi

if [[ ! -f "$dist" ]]; then
  echo "error: $dist is missing" >&2
  echo "hint: run 'pnpm build:index' to compile the composition-index tool before finalizing" >&2
  exit 1
fi

# Atomic copy. cp is effectively atomic for a single small file on a local
# filesystem — the index/snapshot update that follows runs on the complete
# final file, not on a partial write.
if ! cp "$draft" "$final"; then
  echo "error: failed to copy $draft to $final" >&2
  exit 2
fi

# Run the same update script the PostToolUse hook would invoke. This keeps
# the hook's code path load-bearing — any improvements to update.js benefit
# both hook-triggered writes (via Claude Write) and helper-triggered writes
# (via this script).
if ! node "$dist" "$final"; then
  echo "error: composition-index update failed for $final" >&2
  exit 3
fi
