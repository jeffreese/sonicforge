# Composition Draft-First Authoring

All composition-writing skills (`/compose`, `/remix`, `/iterate`) must author to a temporary draft file first and only land the file in `compositions/` via the `pnpm finalize-composition <slug>` helper as the single final step.

## Why

The composition-index hook fires on every file write to `compositions/*.json`. Authoring directly to the final location causes the index to update repeatedly during iteration — once per write. Draft-first authoring ensures the finalize step runs exactly once per completed composition, regardless of how many intermediate edits it took to get there.

Secondary benefits that fall out of the same pattern:

- **Transactional.** If the skill fails mid-generation (validator error, interrupted session, helper script crash), nothing lands in `compositions/`. No partial state, no half-valid files committed to the canonical location.
- **Validation gate.** The schema validator runs against the draft before the finalize step, so the index can trust that any composition it reads is schema-valid.
- **Clean iteration.** Multiple Edit calls during rigidity passes, velocity curves, or hand-tweaks don't pollute the index with intermediate states that never represent a finished composition.
- **Hook guarantee.** The PostToolUse hook matches on Claude's `Write` tool only; shell writes (`cp`, generator scripts, bash tools, large files that can't reasonably be piped through `Write`) bypass it entirely. The `pnpm finalize-composition` helper runs the same update script the hook would have run, so the index and snapshot stay current regardless of which tool produced the draft. See ADR-012 for the rationale.

## How to apply

### `/compose`

1. Author the composition at `/tmp/composition-draft-<slug>.json` throughout generation — all initial writes, all iterative edits, all rigidity-pass adjustments happen against the draft path.
2. Run the schema validator against the draft (`npx tsx -e "import { validate } from './src/schema/validate.ts'; ..."` or equivalent).
3. Run `pnpm finalize-composition <slug>` as the final step. The helper copies the draft to `compositions/<slug>.json` and runs the composition-index update script in one atomic operation.
4. (Optional) Delete the `/tmp` draft after the finalize step. `macOS /tmp` auto-cleans on reboot anyway.

### `/remix`

Same pattern: author at `/tmp/composition-draft-<source-stem>-<genre-slug>.json`, validate, then `pnpm finalize-composition <source-stem>-<genre-slug>`. Do not overwrite the source composition.

### `/iterate`

1. Read the original from `compositions/<slug>.json`.
2. Author modifications at `/tmp/composition-draft-<slug>.json` — do not modify the original in place.
3. Validate the draft.
4. Run `pnpm finalize-composition <slug>`. The helper overwrites `compositions/<slug>.json` with the modified draft and updates the index.

## Scope

This rule applies only to **composition JSON files** in the `compositions/` directory. Other files — skill docs, tests, source code, documentation — follow normal authoring patterns with no draft-first requirement.

## Generator scripts

Python or TypeScript generator scripts that produce a complete composition in one shot (e.g., a scratch script under `tools/compose-helpers/__scratch_*.ts`) already write the full file atomically. Under this rule, generator scripts emit to `/tmp/composition-draft-<slug>.json` rather than directly to `compositions/`, and the skill runs `pnpm finalize-composition <slug>` as the final step. The one-shot nature of generator output does not change the requirement — finalize-via-helper is uniform, not conditional on authoring style.

## Why not `cp` or Claude's `Write` tool directly?

Both were permitted earlier but each has a gap:

- **`cp` and other shell writes** bypass the `PostToolUse` hook entirely (the matcher is `Write`), leaving the index and snapshot stale until someone runs `pnpm rebuild:index` manually. Observed during the Chunk B dogfood.
- **Claude's `Write` tool** does trigger the hook correctly, but large compositions (100KB+) consume enormous context when piped through the model's output channel. A 150KB track is impractical to finalize this way.

The `pnpm finalize-composition <slug>` helper resolves both: it's a shell-level operation (so large files pass through `cp` efficiently) that always runs the composition-index update script (so the index stays current regardless of what tool produced the draft). One command, one source of truth, one contract across all three skills.
