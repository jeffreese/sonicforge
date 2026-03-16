---
name: ship
description: "End-to-end shipping pipeline: test, review, commit, and PR. Idempotent — resumes from current state."
allowed-tools: Read, Write, Bash, Glob, Grep
---

# /ship — Full Shipping Pipeline

You've finished implementing a feature. This skill runs the complete pipeline from "code is
done" to "PR is created." It orchestrates existing skills in the right order, and is designed
to be re-runnable — if a step fails, fix the issue and invoke `/ship` again; it will detect
what's already done and pick up where it left off.

## Phase Detection (Idempotency)

Before doing anything, assess current state to determine which phase to resume from:

```
Phase 0: Pre-flight      → Are we on a feature branch? Is there work to ship?
Phase 1: Test            → Do tests, type-check, and lint pass?
Phase 2: Review          → Do changes comply with ADRs and conventions?
Phase 3: Commit          → Are changes committed? (git status clean?)
Phase 4: Push & PR       → Does a PR exist for this branch?
```

Check current state:
- Current branch (must be a feature branch, not `main`)
- Uncommitted changes (dirty working tree?)
- Unpushed commits
- Existing PR for this branch

| State | Resume From |
|---|---|
| On `main` with no changes | Nothing to ship — tell the user |
| On feature branch, dirty working tree | Phase 1 (Test) |
| On feature branch, clean tree, no PR | Phase 4 (Push & PR) |
| On feature branch, PR already open | Push new commits if any, otherwise done |

## Phase 1: Test

Run all quality checks. All must pass before proceeding.

```bash
pnpm lint
pnpm build
pnpm test
```

If any check fails:
- Report the specific failures clearly
- Stop and let the user fix them
- Tell them to re-run `/ship` after fixing

Do NOT proceed past this phase with failures. Do NOT attempt to auto-fix test failures.

## Phase 2: Review

Run `/review` to check staged/unstaged changes against project ADRs and conventions:
- No React imports (ADR-001)
- No raw Tailwind in templates (ADR-002)
- No shadow DOM (ADR-003)
- Mutations through dispatch (ADR-004/006)
- No Tone.js imports in UI (architecture boundary)
- Tests co-located with implementation

If violations are found, report them and stop. The user fixes and re-runs `/ship`.

If the review is clean, proceed.

## Phase 3: Commit

### 3a: Review what's being committed

```bash
git status
git diff --stat
```

Show a summary of what will be committed.

### 3b: Draft the commit message

Analyze all changes and draft a conventional commit message:
- Appropriate prefix: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
- Summarize the "why" not the "what"
- Keep the first line under 72 characters
- Add a body paragraph if the change is complex

### 3c: Commit

Stage relevant files (prefer naming specific files over `git add -A`) and commit.

### 3d: Update task progress

If this commit completes a task from the current plan:
- Mark it `- [x]` in the plan's `tasks.md`
- Update `.claude/dev-state.json` if the current task is done

## Phase 4: Push & PR

### 4a: Push the branch

```bash
git push -u origin $(git branch --show-current)
```

### 4b: Create the PR

```bash
gh pr create --title "<concise title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Changes
<Key changes, grouped by area>

## Test plan
- [ ] Tests pass (`pnpm test`)
- [ ] Type-check passes (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Visual verification in browser (if UI changes)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Show the user the PR URL.

**Idempotency:** If a PR already exists for this branch, just push new commits.

## Edge Cases

- **Multiple commits:** Let the user specify what goes in each commit. Re-run `/ship` for each.
- **PR has review feedback:** Exit the flow. User makes fixes and re-runs `/ship`.
- **Force push:** Never force push. If there's a conflict, tell the user.
- **Dirty tree but tests already passed:** Re-run tests — the tree changed.
