# Composition Index

## Overview

A feature index of every composition in `compositions/*.json`, maintained automatically via a `PostToolUse` hook. Provides Claude with library-level awareness during `/compose` and `/remix` so new work is informed by what already exists — counteracting the pattern-matching tendencies that push generation toward modal defaults.

The index is a single JSON file at `tools/composition-index/index.json` that stores metadata and derived features for each composition: key, tempo, genre, instrument usage, section structure, chord progression, drum pattern classification, and EDM feature flags. It never contains the composition itself — only facts about it.

## Why

Claude is a pattern matcher. Without an external signal about what has already been composed, new compositions drift from two directions:

1. **Training-distribution pull.** The modal "compose a song" in LLM training data is probably deep house or bass house — 4-on-floor drums, Am/Cm minor keys, 120–128 BPM, reese bass. Unspecified requests land there by default.
2. **Recency pull.** Within a session, any track already generated primes the next one structurally. This isn't a bug; it's how autoregressive generation works. The only counterforce is explicit data about what already exists.

Both drift forces produce a library that looks similar to itself over time, regardless of individual composition quality. The user has already flagged this tendency — "you're a pattern matcher after all; it would make sense that you make patterns." The index file provides an external signal that makes the library's current shape legible to Claude, so diversification can be an informed choice rather than a hoped-for accident.

Even without any active diversification logic, a legible feature snapshot of the composition library is durably useful — it's the kind of data a studio engineer would want when looking at their portfolio.

## Design principles

### Positive framing only

A critical design constraint derived from the "don't think of an elephant" observation: the index consumption flow must **never** tell Claude what not to repeat. Transformer attention treats tokens in "don't use Am, 124 BPM, reese bass" similarly to tokens in "use Am, 124 BPM, reese bass" — the semantic content gets activated regardless of the negation scaffolding around it. Negative framing is a weak signal that can backfire in open-ended creative generation where there's no single "right answer" to resist priming with.

Instead, the index surfaces **library gaps** — dimensions where coverage is low or zero — which semantically pull toward diversity without activating overrepresented tokens. "No compositions in 7/8; no tempos under 80 BPM; no major-key compositions" nudges toward new territory without forbidding anything.

### Information, not enforcement

The index is informational. It does not gate composition generation, does not rewrite user requests, does not block "same-y" outputs. The user owns diversity decisions; the index makes the current state legible so those decisions can be informed.

### Hook-maintained, draft-aware

The index updates via a `PostToolUse` hook on `Write` operations matching `compositions/*.json`. Combined with the draft-first authoring convention (`.claude/rules/composition-drafts.md`), the hook fires exactly once per completed composition — not once per intermediate edit — because intermediate authoring happens in `/tmp/` and only the final validated result lands in `compositions/`.

## Requirements

### Library location and language

- **Location:** `tools/composition-index/` at repo root. Matches the `tools/compose-helpers/` pattern.
- **Language:** TypeScript, compiled to `.mjs` via a build step so the hook can invoke Node directly without `tsx` startup cost per hook fire.

### Module layout

```
tools/composition-index/
├── README.md           # What the index is, how to read it, how to rebuild
├── index.json          # The committed index file — canonical snapshot of the library
├── src/
│   ├── extract.ts      # Per-composition feature extraction (reads JSON, returns IndexEntry)
│   ├── update.ts       # Hook entry point — updates one entry for one file
│   ├── build.ts        # Full rebuild entry point — regenerates the entire index
│   ├── snapshot.ts     # Library-wide snapshot + gap analysis for skill injection
│   └── types.ts        # IndexEntry, LibrarySnapshot, Gap interfaces
└── dist/               # Compiled .mjs output (gitignored)
    ├── update.mjs      # Invoked by the PostToolUse hook
    └── build.mjs       # Invoked by pnpm rebuild:index
```

Build commands added to `package.json`:

- `pnpm build:index` — compile `src/*.ts` → `dist/*.mjs`
- `pnpm rebuild:index` — full rebuild (runs `dist/build.mjs`, regenerates `index.json`)

### Feature extraction tiers

**Tier 1 — direct reads from composition JSON** (v1, must-have):

- `path`, `title`, `bpm`, `key`, `timeSignature`, `genre` (if set)
- `totalBars` (sum of section bar counts)
- `noteCount` (sum across all tracks in all sections)
- `sections[]` — array of `{ name, bars }`
- `instruments[]` — array of `{ id, name, category, source, preset }` where `preset` is either `sample`, `synth` name, or `null` for oneshot/drums
- `masterEffectTypes[]` — e.g. `["eq3", "limiter"]`
- `hasSidechain`, `hasLFOs`, `hasAutomation`, `hasMasterEffects`, `hasSynths`, `hasOneshots`, `hasSampled` (boolean flags)
- `modifiedAt` (file mtime)

**Tier 2 — derived features** (v1, best-effort):

- `progression`: bass-root-per-bar sequence derived from the `category: 'bass'` track(s). Simplified — not full chord detection. e.g., `"A1 | F1-E1 | D1-C1 | E1-A1"`. Future versions can add quality detection from pad voicings.
- `drumPattern`: classification from analyzing kick/snare timing on the drums track:
  - `4-on-floor` if kicks land on beats 0, 1, 2, 3
  - `trap` if kicks land on 0 and (0:2 or 1:0) with snare on 2
  - `half-time` if kicks land on 0 and snare lands on 2 with no mid-bar kick
  - `breakbeat` if kick positions are irregular/syncopated
  - `none` if no drums track
  - `other` if none of the heuristics match
- `dominantRegister` per track: MIDI note range where >80% of notes live (e.g., `"C3-C5"`)

**Tier 3 — quantitative similarity scoring** (stretch, deferred):

- Pairwise similarity between compositions via weighted sum of: key match, BPM distance, Jaccard on instruments, edit distance on section names, bigram overlap on progressions
- "Novelty score" for a new composition relative to the rest of the library
- Clustering of compositions into similarity groups

Defer tier 3 until we see whether the tier 1/2 data is already useful. Similarity scoring requires design calls (which features matter most, how to weight them) best made after dogfooding the simpler version.

### Index file shape

```typescript
// tools/composition-index/src/types.ts
export interface IndexEntry {
  path: string                    // relative to repo root, e.g. "compositions/subterra.json"
  title: string
  bpm: number
  key: string
  timeSignature: [number, number]
  genre: string | null
  totalBars: number
  noteCount: number
  sections: { name: string; bars: number }[]
  instruments: {
    id: string
    name: string
    category: string
    source: string
    preset: string | null
  }[]
  masterEffectTypes: string[]
  hasSidechain: boolean
  hasLFOs: boolean
  hasAutomation: boolean
  hasMasterEffects: boolean
  hasSynths: boolean
  hasOneshots: boolean
  hasSampled: boolean
  progression: string | null      // Tier 2 — simplified bass-root sequence
  drumPattern: string | null      // Tier 2 — classified pattern or null
  modifiedAt: string              // ISO timestamp
}

export interface CompositionIndex {
  version: "1.0"
  generatedAt: string
  entries: Record<string, IndexEntry>  // keyed by path
}
```

### Hook configuration

Add to `.claude/settings.json`:

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "pathPattern": "compositions/*.json",
        "hooks": [
          {
            "type": "command",
            "command": "node tools/composition-index/dist/update.mjs \"$CLAUDE_FILE_PATH\""
          }
        ]
      }
    ]
  }
}
```

(Exact schema and environment variable name verified during implementation — may be `$TOOL_INPUT_FILE_PATH` or similar depending on Claude Code version.)

The hook:

- **Filters to `compositions/*.json`** — never fires on draft files in `/tmp/`, skill docs, source code, or composition subdirectories
- **Is non-blocking** — failures don't interrupt the session; a stale index is better than a broken workflow
- **Is fast** — single-file incremental update, typical runtime <200ms, no full rebuild
- **Is idempotent** — multiple fires on the same file produce identical results

### Library snapshot for skill injection

The `snapshot.ts` module produces the library-level summary that `/compose` and `/remix` read during their startup steps. Format:

```typescript
export interface LibrarySnapshot {
  count: number
  keyDistribution: Record<string, number>         // e.g. { "Am": 6, "Fm": 3, "Cm": 2 }
  bpmStats: { min: number; max: number; median: number; iqr: [number, number] }
  timeSignatureDistribution: Record<string, number>
  genreDistribution: Record<string, number>
  drumPatternDistribution: Record<string, number>
  topInstruments: { id: string; count: number }[]  // top 10
  edmFeatureUsage: {
    hasSidechain: number
    hasLFOs: number
    hasAutomation: number
    hasSynths: number
    hasOneshots: number
  }
  gaps: string[]                                    // human-readable gap descriptions
}
```

The `gaps` field is the most important one for diversification. It's a flat list of strings like:

- `"No compositions in major keys"`
- `"No compositions outside 66–140 BPM"`
- `"No compositions in time signatures other than 4/4"`
- `"No breakbeat or half-time drums"`
- `"No compositions without synths (all currently use at least one)"`
- `"No compositions over 64 bars"`

Gaps are computed by comparing the library's actual distribution against a fixed set of "dimensions worth exploring":

- Keys: major vs minor (is there at least one major-key composition?)
- BPM: brackets at `<80`, `80–110`, `110–140`, `>140`
- Time signature: is there anything other than 4/4?
- Drum pattern: are the common patterns represented?
- Instrumentation: are there compositions without drums / without synths / with unusual timbres?
- Length: are there very short and very long compositions?

The dimensions list is hardcoded in `snapshot.ts` for v1 and extensible. It's short, opinionated, and editable — not a DSL.

### Skill integration

**`/compose` adds an early step, positioned after "parse the request" but before "load reference material":**

> **Step N: Consult the library snapshot.** Read `tools/composition-index/index.json` (or the latest snapshot output if tooling produces one). Note the library's current shape: key distribution, BPM stats, genre spread, drum patterns, top instruments, and especially the `gaps` list. Use this as neutral context — the library has this shape today, and these dimensions are currently uncovered.
>
> If the user's request is **specific** (names a genre, key, BPM, or strong stylistic direction), respect it fully — the snapshot is informational only, not a diversification mandate.
>
> If the user's request is **underspecified** ("compose me a track," "surprise me," a mood word with no constraints), let the `gaps` list influence the creative direction. Framing to use internally: "the library is narrow along these axes; this open-ended request is a good opportunity to try something in that space." Do not verbalize the gaps to the user in the response — integrate them silently into the generation.

**`/remix` adds a lighter version of the same step.** Remixes are inherently specified (source + target genre), so the snapshot's role is narrower: surface whether the requested target genre is already overrepresented in the library, and if so, consider a less-overused sub-variant within the genre.

**Specification-level detection** is a judgment call Claude makes per request — no formal classifier. Rough heuristic:

- **Specified:** user names 2+ of {genre, key, BPM, mood+instrument}, or references a specific existing composition to remix/iterate
- **Underspecified:** user provides fewer than 2 constraints, or asks for "something," "anything," "a track," "surprise me"

Default to injecting the snapshot when in doubt. The cost of an unnecessary injection is minor (context burn); the cost of missing a diversification opportunity is a same-y composition.

### `/library-stats` skill

A new lightweight skill at `.claude/skills/library-stats/SKILL.md` that outputs the current library snapshot on demand. Pure reporting, user-initiated, no composition generation.

Invocation: `/library-stats`

Output: rendered snapshot as a human-readable report — not JSON. Example:

```
Composition library: 12 tracks

Keys:        Am (6), Fm (3), Cm (2), Dm (1)
BPM:         66–140, median 124, IQR 120–128
Time sigs:   4/4 (12)
Genres:      deep bass house (3), trance (2), dubstep (2), ... , melancholic lament (1)
Drum patterns: 4-on-floor (7), half-time (3), none (2)

Top instruments:
  reese_bass (8)  sub_bass (7)  warm_pad (6)  stab_pad (5)  ...

EDM features: sidechain (9)  LFOs (4)  automation (7)  synths (11)  oneshots (9)

Library gaps:
  - No compositions in major keys
  - No compositions outside 66–140 BPM
  - No time signatures other than 4/4
  - No breakbeat drums
  - No compositions without synths
```

Reads the index file, renders, done. Under ~50 lines of skill + a simple formatter in `snapshot.ts`.

## Architecture

### What does NOT change

- **Composition schema** — no new types, no new fields on `Composition`/`Instrument`/`Track`.
- **Engine** — the indexer is shell-side tooling; the runtime engine never touches the index.
- **UI** — nothing rendered, nothing exposed to the user during playback.
- **Validator** — unchanged. The indexer uses the validator defensively but doesn't modify it.

### What does change

- New `tools/composition-index/` directory with source + compiled output
- New `.claude/rules/composition-drafts.md` (landing in the same PR as this plan — authoring convention is a prerequisite)
- `/compose`, `/remix`, `/iterate` skills updated with draft-first step (landing in the same PR as this plan)
- `/compose` gains a "consult library snapshot" step (implementation phase)
- `/remix` gains the same lighter snapshot step (implementation phase)
- New `/library-stats` skill (implementation phase)
- New `.claude/settings.json` hook entry (implementation phase)
- `package.json` scripts: `build:index`, `rebuild:index`
- `.gitignore`: `tools/composition-index/dist/`
- `CLAUDE.md`: pointer to the index from the Schema / Behavioral Notes section

## Non-goals

- **Composition quality analysis.** The index doesn't score whether a composition is "good" — just what features it has.
- **Drift enforcement.** No active blocking, no request rewriting, no forced diversification. The index is informational.
- **UI visualization.** No piano-roll integration, no library browser, no graphs. CLI/skill reporting only.
- **Cross-session memory beyond the file.** The index is persisted in the repo and read fresh at the start of each skill invocation. No caching, no long-lived state, no implicit memory.
- **Full chord detection.** Tier 2 progression extraction is simplified (bass-root sequence). Real chord-quality detection from pad voicings is deferred.
- **Similarity scoring in v1.** Tier 3 is a stretch goal.

## Success metrics

The index is working if:

1. The hook fires exactly once per completed composition (not once per intermediate edit)
2. `index.json` stays current across sessions without manual intervention
3. The `gaps` list correctly identifies underrepresented dimensions in the library
4. `/compose` output diversifies in response to underspecified requests — subjective assessment after 5+ compositions
5. `/library-stats` produces a useful report the user actually wants to read
6. The hook adds <200ms to composition-write latency and never blocks session flow
7. No false fires on non-composition files (settings, skill docs, source code, drafts)

If diversification doesn't improve subjectively after 5+ compositions, the problem is likely the injection format — iterate on the snapshot wording and gap framing, not on the indexer internals.

## Open questions

1. **Exact hook config schema.** Claude Code's `PostToolUse` hook supports path filtering but the exact env var name for the file path (`$CLAUDE_FILE_PATH` vs `$TOOL_INPUT_FILE_PATH` vs reading from stdin) varies by version. Verify during implementation.
2. **Gap dimension list.** The hardcoded list of "dimensions worth exploring" in `snapshot.ts` is opinionated. Start with the list in this spec; extend based on what actually produces useful gap suggestions.
3. **Snapshot injection mechanism in skills.** Is the snapshot pre-rendered into the skill context via a hook that reads it at `/compose` invocation, or does Claude read `index.json` directly as step 1? The latter is simpler and avoids another hook. Start with direct read.
4. **Tier 2 progression detection robustness.** Some compositions don't have a clearly-identified "bass" track (e.g., all-melodic pieces). Graceful fallback: set `progression: null` and continue.
5. **Stale index recovery.** If the index file is deleted or corrupted, the hook's incremental update can't recover — it needs the existing file to update one entry. Solution: `update.mjs` falls back to running `build.mjs` if `index.json` is missing or unparseable.
6. **Similarity scoring follow-up.** If tier 3 becomes valuable, it's a standalone follow-up plan, not an extension of this one.
