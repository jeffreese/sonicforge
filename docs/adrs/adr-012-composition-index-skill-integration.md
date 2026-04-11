---
title: "ADR-012: Composition-Index Skill Integration via Pre-Rendered Snapshot"
date: 2026-04-11
status: accepted
---

# ADR-012: Composition-Index Skill Integration via Pre-Rendered Snapshot

## Status

Accepted

## Context

PR #50 shipped the composition index (`tools/composition-index/index.json`) with `snapshot.ts` producing a `LibrarySnapshot` aggregate — distributions, top instruments, EDM feature counts, and a positive-framed `gaps[]` list. PR #51 added multi-valued composition tags and backfilled all 20 existing compositions, giving the snapshot real genre-coverage signal. The remaining work (Chunk B) was wiring the snapshot into `/compose`, `/remix`, and a new `/library-stats` skill so the index actually influences generation rather than sitting on disk as a passive artifact.

The spec (`docs/plans/composition-index/spec.md`) said "read `index.json` directly at skill startup." That was the simplest possible integration, and on a 20-composition library it would work — but it bundled three issues that would compound over time:

1. **`index.json` is per-entry raw data.** It holds the full feature tree for every composition: instrument list, section list, note count, drum pattern, dominant registers, progression, all tags. The skill only needs the *aggregate* snapshot — distributions, counts, and gaps. Every `/compose` invocation would pull the whole file into context just to extract a few lines of aggregates. Scales poorly.
2. **Skills are Markdown prompts, not code.** The skill can't invoke `renderSnapshot()` — it can only `Read` a file and have Claude interpret the content. So the rendering has to happen somewhere *before* the skill runs. Either Claude re-derives the aggregates from raw entries in-prompt (fragile, token-expensive) or a pre-rendered artifact exists on disk.
3. **`/library-stats` has the same problem in reverse.** The skill's entire job is to print the rendered snapshot. If it has to re-derive the render from `index.json`, every invocation is duplicating work that a script could do once when the index updates.

Separately, the existing `snapshot()` implementation treated every composition as equal weight. But three of the 20 compositions are verification fixtures — `oneshot-house`, `sweepdrone`, `wobblepump` — tagged `demo` per ADR-011's meta-tag convention. They're single-instrument stress tests, not artistic work. A narrow-coverage demo (e.g., `wobblepump` is one synth track) would pull aggregates like "top instruments" toward itself and would let the gap analysis claim dimensions were covered when no real composition covered them. Filtering at the consumer side (in every skill prompt) would duplicate the rule three times and rely on Claude to apply it correctly; filtering at the producer side (in `snapshot()` itself) applies it uniformly, invisibly, and is covered by a single test.

## Decision

**Pre-render the snapshot to `tools/composition-index/snapshot.txt` as part of the existing build/update pipeline, and filter `demo`-tagged entries inside `snapshot()` and `computeGaps()` so every consumer sees only real-library data.**

Concretely:

- **Pre-rendered artifact.** `build.ts` and `update.ts` call a new `writeSnapshot(index, path)` helper after writing `index.json`. `writeSnapshot()` runs `snapshot()` + `renderSnapshot()` and writes the plain-text report to `snapshot.txt` alongside the index. The PostToolUse hook already fires on every composition write, so the file stays current for free. Both files are committed to the repo — derived artifacts, but cheap, small, and always in sync with the composition set at HEAD.
- **Demo filtering in `snapshot()`.** A new `isRealComposition(entry)` helper returns `!entry.tags.includes('demo')`. Applied at the top of both `snapshot()` and `computeGaps()` — every aggregate, distribution, top-instrument count, EDM feature count, and gap is computed only over real compositions. The `LibrarySnapshot` type gains `excludedDemoCount: number` so the render can emit an honest footer like `"(excluding 3 verification compositions tagged 'demo')"` — and so consumers can tell the filter ran without needing to re-derive it.
- **`/compose` integration.** New step 2 "Consult the library snapshot" after "Parse the request" and before "Load reference material". Reads `snapshot.txt`, applies a specification-level heuristic (specified = 2+ of {genre, key, BPM, mood+instrument}; underspecified otherwise; default to underspecified when in doubt), and silently integrates gap signals for underspecified requests. Specified requests are respected without override. The instruction explicitly tells Claude *not* to verbalize the gaps in the response.
- **`/remix` integration.** New step 3 "Consult the library snapshot — lightly". Remixes are inherently specified, so the snapshot's role is narrower: check whether the target genre is overrepresented (suggesting a sub-variant like `progressive-trance` over generic `trance`) and whether the target genre shows up as a gap (free signal to commit without second-guessing). Silent integration, same as `/compose`.
- **`/library-stats` skill.** New skill at `.claude/skills/library-stats/SKILL.md`. Reads `snapshot.txt` and prints it verbatim in a fenced code block. No generation, no interpretation, no judgment. Under ~40 lines including frontmatter. Points the user at `pnpm rebuild:index` if the file is missing (fresh-clone bootstrap).
- **`CLAUDE.md` pointer.** Brief entry under Behavioral Notes with the role, file path, and a reference to this ADR. One paragraph; no duplication of the skill instructions.

## Alternatives considered

### A: Skills read `index.json` directly

The spec's original suggestion. Each skill instructs Claude to read the full index file and mentally extract distributions and gaps.

- **Pros:** Zero new artifacts. Uses the existing file. Simplest possible integration.
- **Cons:** Burns per-invocation context on raw entry data the skill doesn't need. Requires Claude to re-derive aggregates in-prompt (fragile, expensive, and inconsistent across invocations). Doesn't solve `/library-stats` — that skill wants a rendered report, not a JSON blob. Scales poorly as the library grows.

**Rejected** because the context and reliability costs compound with every skill invocation, while the pre-rendered snapshot pays its cost once per composition write (inside the hook that was already running) and amortizes across every subsequent read.

### B: Embed the rendered snapshot inside `index.json` under a `snapshot` field

Extend the index file with a pre-computed snapshot field so it's co-located with the raw data.

- **Pros:** One file on disk, not two. Atomic updates.
- **Cons:** Skills still read the whole file to reach the snapshot field, so the context efficiency win from pre-rendering is lost. The JSON structure of `LibrarySnapshot` is less readable than the plain-text render for a prompt consumer. And `/library-stats` still has to extract + format.

**Rejected** because the whole point of pre-rendering is that skills read *only* the tiny rendered view, not the full raw data. Bundling them back together defeats the purpose.

### C: Filter demos inside every skill prompt instead of inside `snapshot()`

Keep `snapshot()` unchanged; add a "ignore `demo`-tagged entries" instruction to every skill that consumes the snapshot.

- **Pros:** No code change. Filter logic lives alongside the skill that applies it.
- **Cons:** Three skills × same rule = triplicated instructions that can drift. Relies on Claude to apply the filter correctly every time. Doesn't help the rendered snapshot file itself — the report would still show inflated counts. And `computeGaps()` direct callers (tests, future tooling) would silently get demo-polluted results.

**Rejected** because the filter is a data concern, not a skill concern. Applying it at the `snapshot()` boundary gives every consumer — skills, rendered reports, tests, future cross-composition tooling — the correct view without per-caller discipline.

### D: Gitignore `snapshot.txt` as a derived artifact

Treat `snapshot.txt` like `dist/` — rebuild from source on each clone.

- **Pros:** One less file to review in PR diffs. Consistent with the "don't commit generated output" principle.
- **Cons:** `index.json` is already committed (it's updated by the same hook on the same cadence). Committing one but not the other splits the pair across a visibility line. And a fresh clone would get an index but no snapshot until the user ran `pnpm build:index && pnpm rebuild:index` — extra bootstrap friction for a file that's a few hundred bytes of plain text.

**Rejected** in favor of committing both files. They're both hook-maintained derived artifacts at the same cadence; they should travel together. PR diffs for composition work already include `index.json` changes — adding the snapshot line is informative, not noisy.

### E: Skip `/compose` integration on specified requests entirely (no read at all)

Apply the snapshot step conditionally based on request shape: only read the file for underspecified requests.

- **Pros:** Saves a `Read` call on specified requests.
- **Cons:** The specification-level detection happens after the read anyway — Claude has to interpret the user's message to classify it, which is cheap. Reading a few hundred bytes of plain text is a trivial cost compared to the rest of the `/compose` flow (which reads `gm-samples.md`, `genre-guide.md`, and often `synth-presets.md` + more). The "maybe influences underspecified requests" vs "definitely never influences specified requests" asymmetry is already handled *in-prompt* by the specification-level instruction.

**Rejected** because the optimization saves nothing meaningful and adds a branching decision that would just become another source of skill drift.

## Implications

### What changes

- **`tools/composition-index/src/snapshot.ts`** — `isRealComposition()` helper exported; demo filter applied inside `snapshot()` and `computeGaps()`; `renderSnapshot()` emits an excluded-demos footer.
- **`tools/composition-index/src/types.ts`** — `LibrarySnapshot.excludedDemoCount: number` added.
- **`tools/composition-index/src/build.ts`** — `writeSnapshot(index, path)` helper, `SNAPSHOT_PATH` constant, `deriveSnapshotPath()` helper. Script entry point calls both `writeIndex` and `writeSnapshot`.
- **`tools/composition-index/src/update.ts`** — `UpdateOptions.snapshotPath` added; `update()` calls `writeSnapshot()` in both the incremental and rebuild-fallback code paths.
- **`tools/composition-index/snapshot.txt`** — new committed artifact, regenerated by the hook on every composition write.
- **`.claude/skills/compose/SKILL.md`** — new step 2 "Consult the library snapshot" with specification-level detection heuristic; downstream steps renumbered.
- **`.claude/skills/remix/SKILL.md`** — new step 3 "Consult the library snapshot — lightly"; downstream steps renumbered.
- **`.claude/skills/library-stats/SKILL.md`** — new skill (~40 lines).
- **`CLAUDE.md`** — file-organization entry and behavioral-notes pointer.
- **Tests** — `snapshot.test.ts` gains 10+ cases covering demo filtering across every aggregate, gap, distribution, footer wording, and singular/plural. `build.test.ts` gains 5 cases covering `writeSnapshot`, `deriveSnapshotPath`, snapshot-file emission from both the update and the rebuild-fallback paths.

### What doesn't change

- **The index file schema.** `index.json` still has the same shape it had after PR #51. Demo entries are still recorded in the index — they're just filtered out of the aggregated view.
- **The PostToolUse hook itself.** Same matcher, same stdin parsing, same latency. The hook was already running on every composition write; it now writes one extra small file per fire (~0.5ms overhead).
- **The positive-framing guarantee.** Every gap string is still vetted for negative phrasing by the existing positive-framing test in `snapshot.test.ts`. Demo filtering is orthogonal.
- **`/iterate` skill.** Iterations start from an existing composition, so library shape is not relevant — the user has already committed to the source. Snapshot consultation is skipped here.

### Compatibility and migration

- **Backwards-compatible.** The new `excludedDemoCount` field is additive; no reader code breaks on its presence.
- **Fresh-clone bootstrap.** `pnpm build:index && pnpm rebuild:index` generates both `dist/` and `snapshot.txt` in one step (already in `package.json` scripts). `/library-stats` documents this explicitly.
- **Drift prevention.** If a composition gets the `demo` tag added or removed, the hook will regenerate the snapshot on that same write — no separate invalidation step.

## Consequences

Positive:

- **Skill integration is cheap.** Each skill reads a few hundred bytes of plain text instead of kilobytes of raw JSON. `/compose` can consult the snapshot on every invocation without context burn.
- **`/library-stats` is trivial.** The skill is a `Read` + verbatim print — no rendering logic duplicated from `snapshot.ts`.
- **Gap analysis reflects real library.** `wobblepump` no longer suggests the library is "mostly one-instrument tracks"; the primary-genre gap list no longer pollutes with `demo`-tagged variants.
- **Single source of truth for filtering.** The demo rule lives in one file (`snapshot.ts`) with one test file as its contract. Future consumers inherit the behavior automatically.
- **Pre-rendered format is deterministic and testable.** Tests assert the exact wording of the footer, the singular/plural variant, and the excluded count — no Claude-in-prompt interpretation in the test loop.

Negative:

- **Two committed files per composition write** instead of one. PR diffs grow by a few lines per composition change. Mitigated by the small file size — the snapshot is ~25 lines of text for the current 17-track library.
- **Demo filter is opt-out, not opt-in.** Any future caller that *wants* to see demo data (a debug view, a "library including fixtures" report) has to bypass `snapshot()` and work against raw entries. Acceptable cost — we don't have such a caller today, and adding a flag later is backwards-compatible.
- **`snapshot.txt` can drift from `index.json` if the two writes are interrupted between them.** The hook writes them back-to-back in the same process, so the window is effectively zero; crash recovery via `pnpm rebuild:index` regenerates both. Not a real-world risk.

## Origin

Emerged from Chunk B of the composition-index plan. Jeff pushed back on the spec's "skills read `index.json` directly" approach on efficiency grounds and chose to filter demos inside `snapshot()` rather than in each skill prompt ("Those files shouldn't even be processed by `snapshot()`"). The pre-rendered `snapshot.txt` pattern followed naturally from both choices: once filtering was centralized and efficiency mattered, producing the rendered view at write time was strictly better than asking every skill to re-derive it.
