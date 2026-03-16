---
name: next
description: "Find the next task, create a feature branch, and enter plan mode — or resume in-progress work."
allowed-tools: Read, Write, Bash, Glob, Grep
---

# /next — Continue Development

Find and initiate the next development task, or resume work in progress.

## Steps

1. **Read state.** Read `.claude/dev-state.json` to check for in-progress work.

2. **If work is in progress** (`status: "in-progress"`):
   - Show what's currently active: plan name, task description, branch, and any pending context
   - Check git status — confirm we're on the right branch
   - Ask: "Pick up where you left off, or mark this task done and move to the next?"
   - If continuing: enter plan mode with context from the pending field
   - If done: mark the task `- [x]` in the plan's `tasks.md`, update dev-state, then proceed to find next task

3. **If idle** (`status: "idle"` or `current_plan: null`):
   - Read `docs/plans/backlog.md` to find the highest-priority active plan
   - Read that plan's `tasks.md`
   - Find the first `- [ ]` (unchecked) task
   - Present it to the user: plan name, section (epic), task description

4. **Check git readiness:**
   - Run `git status` — check for uncommitted changes
   - Check current branch — if not on `main`, warn
   - If on main: ensure it's up to date (`git log --oneline -1 origin/main..HEAD`)
   - If there are uncommitted changes: stop and tell the user what needs to be resolved first

5. **Set up the work environment:**
   - If on `main` and clean: create a feature branch (e.g., `feat/sf-app-shell` derived from the task name)
   - Update `.claude/dev-state.json`: set `current_plan`, `current_task`, `branch`, `status: "in-progress"`

6. **Check for applicable skills.** Before planning manually, check if `/scaffold-feature` or other skills can automate part of the work.

7. **Enter plan mode.** Create an implementation plan covering:
   - Files to create and edit
   - Which existing patterns to follow (reference completed tasks or existing code)
   - Verification steps (type check, tests, lint)
   - Acceptance criteria from the plan's `spec.md`

   Do NOT start writing code — get the plan approved first.

## When a task is completed

When the user confirms a task is done:
1. Mark it `- [x]` in the plan's `tasks.md`
2. Check if the entire section (epic) is done — if so, note it
3. Check if the entire plan is done — if so, move it to "Completed" in `backlog.md`
4. Update `.claude/dev-state.json`: clear current task, set `status: "idle"`
5. Offer to continue with the next task or take a session break

## Session resumption

After `/clear` or a new session, if `dev-state.json` has `status: "in-progress"`, present:
> "Last session you were working on [plan]: [task] on branch [branch]. [pending context]. Want to continue?"
