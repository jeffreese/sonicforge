# Feature Branch Workflow

Never commit directly to `main`. All work happens on feature branches.

## Branch naming

Use conventional prefixes matching the commit type:
- `feat/` — new features
- `fix/` — bug fixes
- `chore/` — tooling, dependencies, config
- `refactor/` — code restructuring
- `docs/` — documentation changes

Example: `feat/sf-transport-bar`, `fix/sample-loading-race-condition`

## Workflow

1. Start from `main` (up to date)
2. Create a feature branch
3. Do the work, commit on the branch
4. Push and create a PR (`/ship` handles this)
5. User reviews and merges on GitHub

If you're about to commit and realize you're on `main`, stop and create a branch first. Move uncommitted changes to the new branch.
