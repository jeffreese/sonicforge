# Composition Index

A feature index of every composition in `compositions/*.json`, maintained
automatically via a `PostToolUse` hook on `Write` operations. Provides
library-level awareness during `/compose` and `/remix` so new work is informed
by what already exists — counteracting pattern-matching drift toward modal
defaults.

See [`docs/plans/composition-index/spec.md`](../../docs/plans/composition-index/spec.md)
for the full design rationale and non-goals.

## What's in the index

A single JSON file at `tools/composition-index/index.json` containing one entry
per composition, keyed by path. Each entry records:

**Tier 1 (direct reads):** title, BPM, key, time signature, genre, total bars,
note count, section list, instrument list, master effect types, EDM feature
flags (sidechain, LFOs, automation, synths, oneshots, sampled).

**Tier 2 (derived):** simplified bass-root progression, drum pattern
classification (`4-on-floor`, `trap`, `half-time`, `breakbeat`, `other`,
`none`), dominant MIDI register per melodic/bass track.

The index never contains composition audio data — only facts about it. See
[`src/types.ts`](src/types.ts) for the complete shape.

## Build + rebuild

The tool compiles via an isolated `tsconfig.json` that emits ES modules to
`dist/` (gitignored, so a fresh clone needs to rebuild once).

```bash
pnpm build:index     # compile src/*.ts → dist/*.js
pnpm rebuild:index   # build + run dist/build.js to regenerate the full index
```

First-time setup after cloning: run `pnpm build:index` so the PostToolUse hook
has a compiled `dist/update.js` to invoke.

## How the hook keeps it current

A `PostToolUse` hook in `.claude/settings.json` matches `Write` on
`compositions/*.json` and runs `node tools/composition-index/dist/update.js
<file-path>`. The update script:

1. Reads the written composition
2. Extracts features via `src/extract.ts`
3. Updates or inserts the entry in the existing `index.json`
4. Falls back to a full rebuild if `index.json` is missing or unparseable

This pairs with the [draft-first authoring convention](../../.claude/rules/composition-drafts.md)
so the hook fires exactly once per completed composition — drafts live in
`/tmp/` and only the validated final result lands in `compositions/`.

## Reading the snapshot

Two consumption paths — pick the cheaper one for the job:

1. **Pre-rendered plain-text digest at `snapshot.txt`** (committed, updated by
   the hook alongside `index.json`). Loaded by `/compose`, `/remix`, and
   `/library-stats` at skill startup. Cheap to read (a few hundred bytes),
   human-friendly, and always current with the composition set at HEAD.
   Regenerate manually with `pnpm rebuild:index`.
2. **Structured `index.json`** for cross-composition queries, tier-3 similarity
   scoring, or anything that needs per-entry detail. This is the raw feature
   tree — use it from code, not from skill prompts.

The `snapshot.ts` module aggregates the full index into a `LibrarySnapshot`
with distributions, top instruments, and a `gaps[]` list of dimensions the
library hasn't explored yet. `renderSnapshot()` produces the plain-text report
that `writeSnapshot()` persists to disk.

### Demo filtering

Entries carrying the `demo` meta-tag (see ADR-011) are verification fixtures
— `oneshot-house`, `sweepdrone`, `wobblepump` — not artistic work. `snapshot()`
and `computeGaps()` filter them out at the top so every aggregate, distribution,
gap, and top-instrument count reflects only real compositions. The render emits
a footer like `"(excluding 3 verification compositions tagged 'demo')"` when
the filter ran. Direct callers of `snapshot()`, `computeGaps()`, and `renderSnapshot()`
all inherit the filter automatically. See ADR-012 for the skill-integration
design.

### Positive framing

Gaps use **positive framing** — they name what's missing, not what to avoid —
because negation primes rather than suppresses in transformer attention. The
positive-framing guarantee is enforced by a test in `snapshot.test.ts` that
scans every generated gap string for `don't` / `avoid` / `never`.

## Non-goals

- Composition quality scoring — the index records features, not opinions
- Active enforcement / request rewriting — informational only, user owns diversity decisions
- UI rendering — CLI / skill reporting only, no visualization
- Full chord detection — Tier 2 progression extraction is simplified (bass-root sequence)
- Similarity scoring — deferred to Tier 3 as a follow-up plan
