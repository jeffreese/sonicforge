---
title: "ADR-011: Multi-Valued Tags for Composition Metadata"
date: 2026-04-11
status: accepted
---

# ADR-011: Multi-Valued Tags for Composition Metadata

## Status

Accepted

## Context

Until this decision, the SonicForge composition schema had no structured field for genre, mood, or any categorical metadata. The `Metadata` interface held `title`, `bpm`, `timeSignature`, `key`, and a free-text `description`. Any genre-ish information lived inside that prose description ("Dark, aggressive industrial techno", "Bass-forward trance mix with a drum & bass break").

This became a concrete limitation when ADR-010's compose-helpers work led directly into the composition-index feature (PR #50). The indexer aggregates composition features into a `LibrarySnapshot` that `/compose` and `/remix` consult during generation for "what does the library already cover, and what dimensions are unexplored?" diversification cueing.

Without a structured genre field, the `primaryTagDistribution` and `tagDistribution` fields on `LibrarySnapshot` were empty, and the gap analysis surfaced only technical gaps (BPM brackets, drum patterns, time signatures). The most expressive dimension — "the library has 8 dubstep tracks and zero jazz or ambient" — was invisible.

Separately, the `/remix` skill already referenced `metadata.genre` in two places as if it existed, which was a pre-existing bug. The skill had been drafting against an imagined schema field for months.

The tension from the previous composition-index work was that the library's shape had to be *legible* to the consumer (indexer + skills) without calcifying the author's (human + Claude) flexibility. Real compositions rarely fit a single genre label cleanly — `dark-dubstep-drops.json` is dubstep, but also horror, also cinematic, also has two-drop structure. Any scheme that forces a single primary genre discards information; any scheme that allows multiple equal genres loses the "what is this piece primarily?" signal.

## Decision

**Add an optional `tags?: string[]` field to `Metadata`, with the first tag conventionally being the primary genre and remaining entries being modifiers, moods, or structural hints in no particular order. Enforce lowercase-hyphenated format (`^[a-z0-9]+(-[a-z0-9]+)*$`) via the validator. Do not remove the `description` field — tags are structured metadata, description is prose.**

Concretely:

- **Schema:** `Metadata.tags?: string[]` — optional for backwards compatibility, but skills are instructed to always emit tags when authoring
- **Validator:** rejects non-array, empty array, non-string entries, invalid format, and duplicates. Reports all errors in a single `ValidationError` batch.
- **Convention:** the first tag is the primary genre. The remaining entries are unordered modifiers. This is a documentation convention, not a schema constraint — both `tags[0]` and the rest of the array are plain strings.
- **Indexer:** `IndexEntry.tags: string[]` and `IndexEntry.primaryTag: string | null` (convenience pre-computed from `tags[0]`). `LibrarySnapshot.tagDistribution` and `LibrarySnapshot.primaryTagDistribution` aggregate both the full tag multiset and the primary-genre-only distribution separately. Gap analysis checks a hardcoded list of well-known primary genres and surfaces the missing ones.
- **Seed vocabulary:** `.claude/skills/compose/genre-guide.md` lists common genres (EDM family, other electronic, non-electronic), moods, energy markers, structural hints, sound-design descriptors, and era references as a non-exhaustive starting point. Authors are free to invent new tags when none fit, but the seed list encourages consistency.
- **Backfill:** all 20 existing compositions tagged in this same PR, with human-reviewed primary-genre choices.
- **Meta-tag convention:** the tag `demo` marks verification/test compositions (`oneshot-house.json`, `sweepdrone.json`, `wobblepump.json`) that aren't artistic work. Position after the primary genre. Consumers may filter on this tag when computing "real library" statistics.

## Alternatives considered

### B1: Flat multi-value tags, no primacy convention

`tags: string[]` with no distinction between "primary" and "secondary." All tags are equal.

- **Pros:** Maximally simple, matches Vorbis comments and ID3v2's repeated-field style, no convention to document or enforce
- **Cons:** Loses the "this is a dubstep track with horror elements" vs. "this is a horror track with dubstep elements" distinction. When the indexer aggregates for diversification cueing, every track of genre X counts equally whether it's genre X as a primary identity or as a flavoring element — which understates some tracks and overstates others.

**Rejected because** the primary/modifier distinction is central to how humans think and talk about genre, and the cost of the convention is documentation-only (no validator change, no schema field, just a doc rule).

### B3: Separate `genre` + `tags` fields

`genre?: string` (single primary, optionally required) and `tags?: string[]` (modifiers, moods, descriptors).

- **Pros:** Explicit separation of "what is it?" from "what are its flavors?" — no convention needed, readable without knowing the project's norms
- **Cons:** Two fields to author for every composition. Forces a single-genre decision even when the track is genuinely multi-genre (is "dark-dubstep-drops" a `dubstep` with a `dark` tag, or a `dark-dubstep` with no secondary tags?). More schema surface, more decisions, harder to migrate later if the single-genre model turns out to be wrong.

**Rejected because** the convention-based primacy (B2) gives 80% of the benefit with 20% of the schema surface, and the decision between "genre vs. modifier" that B3 forces is exactly the kind of ambiguity the convention absorbs gracefully. B3 can still be reached later by adding a `primaryGenre?: string` alongside `tags` if the convention turns out to be insufficient — B2 doesn't foreclose on it.

### C: Parse genre from `description` prose heuristically

Keep the schema unchanged, have the indexer run regex matches against the description text to extract genre tokens.

- **Pros:** Zero schema change, zero author burden
- **Cons:** Fragile (false positives on "this is NOT trap"), noisy, non-deterministic, requires constant maintenance of the extraction heuristics, and fights against the "the schema is the contract" principle in ADR-009.

**Rejected unconditionally.** Heuristic extraction is the wrong tool for primary metadata.

### D: Leave genre unstructured, rely on technical features

Keep the schema as-is. The composition-index already classifies drum patterns, aggregates instrument usage, reports BPM brackets — arguably enough signal to group compositions without explicit genre metadata.

- **Pros:** Smallest possible change, no migration burden, no schema surface
- **Cons:** The whole point of the composition-index is to surface library shape for diversification cueing. Without genre data, the snapshot's most expressive dimension is absent. The first impression of `/library-stats` and the first use of snapshot-aware `/compose` would land with boring gaps ("no non-4/4 compositions") instead of meaningful ones ("no jazz, no ambient, no lo-fi").

**Rejected** because under-powering the consumer (composition-index + Chunk B skills) to save the producer (schema) a small addition is the wrong tradeoff for a long-lived project.

### Controlled vocabulary vs. free-form

Considered: constrain `tags[]` to a hardcoded enum of known genres + moods + descriptors, rejecting unknown tags at validation time.

- **Pros:** Consistency is automatic — no "Dubstep" vs. "dubstep" vs. "dub-step" drift
- **Cons:** Fights against the long tail. Every new genre or sub-variant (`brostep`, `liquid-dnb`, `deep-bass-house`, `melancholic-lament`) requires a schema update and a validator update. Dramatically slows authoring for marginal consistency gains at this library size.

**Rejected** in favor of format-enforced free-form: the validator enforces `^[a-z0-9]+(-[a-z0-9]+)*$` (which rules out case and whitespace drift) but accepts any matching token. A soft-controlled vocabulary in `genre-guide.md` encourages consistency without blocking new tokens.

## Implications

### What changes

- **Schema:** `Metadata.tags?: string[]` (optional, backwards-compatible)
- **Validator:** new `validateTags()` with 16 test cases covering every validation rule
- **Composition files:** all 20 existing compositions backfilled with human-reviewed tags
- **Indexer:** `IndexEntry` drops the deprecated `genre` field, gains `tags` and `primaryTag`. `LibrarySnapshot` drops `genreDistribution`, gains `tagDistribution` and `primaryTagDistribution`. Gap analysis surfaces missing primary genres and untagged-composition counts.
- **Skills:** `/compose` instructed to always emit tags; `/remix` references `metadata.tags` (fixing a pre-existing reference to the nonexistent `metadata.genre`); `/iterate` preserves tags unless the iteration changes genre character
- **Docs:** `composition-format.md`, `CLAUDE.md`, `genre-guide.md` all updated with the field, the convention, and the seed vocabulary

### What doesn't change

- **Engine:** tags have no runtime effect; the engine never reads them
- **UI:** no tag rendering, no tag editor — this is metadata for authoring + indexing, not user-facing at this stage
- **Description field:** retained. Prose descriptions capture context tags can't (production notes, references, technique explanations). Tags supplement description, not replace it.
- **Existing composition JSON files without tags:** still valid. `tags` is optional and the validator treats its absence the same as any other optional field.

### Compatibility and migration

- **Forward-compatible:** the convention can grow into B3 (`primaryGenre?: string` alongside `tags`) later without breaking any existing file. The primary-tag-first rule becomes redundant when `primaryGenre` lands, but existing files continue to parse correctly.
- **Controlled-vocabulary-compatible:** if the library grows to a point where free-form tag drift becomes a real problem, a controlled vocabulary can be layered onto the validator as a second pass. The format regex rules out the easy drift (case, whitespace); only genuine spelling variants would survive to hit the controlled check.
- **Weighted-tag-compatible:** if per-tag weights become valuable, the field can migrate to `tags: Array<string | { tag: string; weight: number }>` with the schema interpreter falling back to weight 1.0 for bare strings.

None of these migrations are anticipated; documenting them clarifies that B2 is a local optimum, not a global commitment.

## Consequences

Positive:

- The composition-index surfaces genre-level gaps, making diversification cueing actually meaningful
- `/library-stats` (Chunk B) has rich distribution data to report
- The `/remix` skill's pre-existing reference to `metadata.genre` gets fixed as a side effect
- Future `/compose` work can consult tag distribution for "what's the library missing?" without relying on technical features alone
- The human + Claude author both get a single, uniform place for multi-dimensional classification

Negative:

- Authors must now remember to emit tags when writing compositions. Skill docs document this requirement; the validator doesn't enforce it because `tags` is optional (to preserve backwards compatibility with any pre-tag files).
- The soft-controlled vocabulary is a discipline, not an enforcement. Drift between similar tags (`dub-step` vs. `dubstep`, `lo-fi` vs. `lofi`) is possible. Mitigation: the seed vocabulary in `genre-guide.md` lists preferred forms, and the format regex rules out the most common drift vectors.
- One more field to remember for schema consumers. The cost is small (optional string array) but non-zero.

## Origin

Surfaced during the composition-index plan implementation (PR #50) when the author noticed the snapshot's `genreDistribution` was always empty because the schema had no genre field. User explicitly chose B2 ("I want to do this correctly for the long run and many songs don't just fit one genre") after reviewing B1/B3/C/D alternatives.
