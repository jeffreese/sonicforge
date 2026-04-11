# Composition Draft-First Authoring

All composition-writing skills (`/compose`, `/remix`, `/iterate`) must author to a temporary draft file first and only write to `compositions/` as the final step after schema validation.

## Why

The composition-index hook fires on every `Write` to `compositions/*.json`. Authoring directly to the final location causes the index to update repeatedly during iteration — once per Write call. Draft-first authoring ensures the hook fires exactly once per completed composition, regardless of how many intermediate steps it took to get there.

Secondary benefits that fall out of the same pattern:

- **Transactional.** If the skill fails mid-generation (validator error, interrupted session, helper script crash), nothing lands in `compositions/`. No partial state, no half-valid files committed to the canonical location.
- **Validation gate.** The schema validator runs against the draft before the final Write, so the hook-triggered indexer can trust that any composition it reads is schema-valid. Simplifies the indexer — no defensive parsing of malformed JSON.
- **Clean iteration.** Multiple Edit calls during rigidity passes, velocity curves, or hand-tweaks don't pollute the index with intermediate states that never represent a finished composition.

## How to apply

### `/compose`

1. Author the composition at `/tmp/composition-draft-<slug>.json` throughout generation — all initial Writes, all iterative Edits, all rigidity-pass adjustments happen against the draft path.
2. Run the schema validator against the draft (`npx tsx -e "import { validate } from './src/schema/validate.ts'; ..."` or equivalent).
3. Write the validated content to `compositions/<slug>.json` — this is the one and only Write to the final location.
4. (Optional) Delete the `/tmp` draft after the final Write. `macOS /tmp` auto-cleans on reboot anyway.

### `/remix`

Same pattern: author at `/tmp/composition-draft-<source-stem>-<genre-slug>.json`, validate, then Write once to `compositions/<source-stem>-<genre-slug>.json`.

### `/iterate`

1. Read the original from `compositions/<slug>.json`.
2. Author modifications at `/tmp/composition-draft-<slug>.json` — don't modify the original in place.
3. Validate the draft.
4. Write the modified content back to `compositions/<slug>.json` (overwriting the original) — a single Write.

## Scope

This rule applies only to **composition JSON files** in the `compositions/` directory. Other files — skill docs, tests, source code, documentation — follow normal authoring patterns with no draft-first requirement.

## Generator scripts

Python or TypeScript generator scripts that produce a complete composition in one shot (e.g., the `gen_remix.py` pattern used during the deep-bass-house remix) already write the full file atomically. Under this rule, generator scripts should emit to `/tmp/composition-draft-<slug>.json` rather than directly to `compositions/`, and the skill performs the final copy to the canonical location as the last step. The one-shot nature of generator output doesn't change the requirement — draft-first is uniform, not conditional on authoring style.
