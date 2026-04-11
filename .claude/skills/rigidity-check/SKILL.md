---
name: rigidity-check
description: "Audit an existing composition for mechanical rigidity — velocity uniformity, duplicate bars, section contrast, transition markers."
argument-hint: "[composition.json]"
allowed-tools: Read, Write, Glob
---

# /rigidity-check — Audit a Composition for Mechanical Uniformity

Audit an existing composition against the four rigidity checks. Report findings; ask before applying any fixes.

This skill is the canonical home for the four checks. `/compose` step 5 and `/remix` step 8 apply the same checks inline during generation — keep them in sync if the criteria here are refined.

## Invocation

- `/rigidity-check <path>` — audit the specified composition
- `/rigidity-check` — audit the most recently modified composition in `compositions/`

## Steps

1. **Resolve the composition.** If no path given, glob `compositions/*.json` and pick the most recently modified. If ambiguous, ask which one.

2. **Read and parse** the composition JSON. If validation fails, report the error and stop — there's no point auditing a schema-invalid file.

3. **Run the four checks** in order. For each finding, record the specific location (track id, bar range, section name) and a severity: `clean`, `moderate`, or `critical`.

4. **Report findings** as a compact per-check list. Use plain text, no emojis. Example format:

   ```
   Rigidity audit: subterra.json

   Velocity uniformity:
     - drums: 78% of notes at velocity 115 (moderate)
     - reese: clean
     - pad: clean

   Bar-to-bar identicalness:
     - drums bars 4-15: 12 consecutive identical bars (moderate)
     - reese bars 0-11: clean

   Section contrast:
     - verse-1 → verse-2: identical instrument set, density, register (moderate)
     - bridge → outro: clean

   Transition markers:
     - intro → verse-1: clean (impact + riser at boundary)
     - verse-1 → bridge: flat transition, no marker (moderate)

   Summary: 4 moderate findings, 0 critical. Apply fixes?
   ```

   If everything is clean, say so explicitly: `Summary: all checks clean — no adjustments needed.`

5. **Ask for confirmation** before applying any fixes. Do not auto-apply. If the user says yes, proceed; if no, stop after the report.

6. **If applying fixes, use the draft-first convention.** Author the modifications at `/tmp/composition-draft-<slug>.json`, validate against the schema, then perform a single final Write back to the source path. See `.claude/rules/composition-drafts.md` for the full convention.

7. **Report what was applied.** After the fix write, describe each adjustment in one line. Example: "Applied natural velocity curve to drums track; introduced velocity accent at bar 8 in drums (break from 12-bar identical run); added crash on beat 1 of bridge section."

## The four checks

### 1. Velocity uniformity

**Detection:** For each track, count notes by velocity value. If more than 60% of a track's notes share a single velocity, flag `moderate`. If 100% share, flag `critical`. Ignore ghost-notes (velocity <40 or `articulation: 'ghost'`) — they're deliberately uniform.

**Fix:** Apply `velocityCurve` from `tools/compose-helpers/humanize.ts` with style `'natural'` — emphasizes downbeats by +8 and softens offbeats by −4. For tracks that should already have a deliberate shape (leads, fills), use `'accented-downbeats'` instead.

### 2. Bar-to-bar identicalness

**Detection:** For each track, walk consecutive bars and compare the set of notes within each. Two bars are "identical" if they contain the same pitches at the same within-bar time offsets with the same velocities. Flag runs of 4+ consecutive identical bars as `moderate`.

**Fix:** For each run of length N, introduce one variation at the middle bar. Options (pick one per run):
- Drop one hit (e.g., remove a kick on beat 3)
- Add a ghost note between existing hits
- Bump one note's velocity by ±15
- Swap one pitch for a neighboring chord tone
- Add a short fill in the last beat of the middle bar

### 3. Section contrast

**Detection:** For each adjacent section pair, compare:
- **Instrument set** — the `instrumentId` values present in each section's tracks
- **Note density** — total notes divided by bar count, within 10% of each other
- **Dominant register** — the MIDI range covering >80% of notes, within ±1 octave

If all three match between adjacent sections, flag as `moderate`. Two different sections shouldn't be indistinguishable at the structural level.

**Fix:** This is a judgment call based on section role. Options (pick what fits the energy arc):
- Drop one instrument in the later section (thinning)
- Add an instrument in the later section (building)
- Swap drum pattern (e.g., from `fourOnFloor` to `halfTime`, or vice versa)
- Shift register up or down by an octave
- Raise or lower overall dynamics by ~15 velocity points

### 4. Transition markers

**Detection:** For each section boundary, examine the last bar of section N and the first bar of section N+1. A transition is "marked" if any of the following is present within 1 bar of the boundary:
- A crash, ride, or cymbal hit
- A fill (rapid succession of 4+ notes on a drum or melodic instrument)
- A rest (empty bar or drop-out of most tracks)
- A velocity swell of >15 points across 2+ notes
- An FX hit (impact, riser, sweep from a oneshot track)
- An automation point

If none of these are present, flag as `moderate` (flat transition).

**Fix:** Add one marker at the boundary. Options:
- Add a crash on beat 1 of section N+1
- Drop out the kick in the last beat of section N (kick drop-out)
- Add a snare fill in the last half-bar of section N (four snare hits at 16th intervals)
- Add an FX impact at the downbeat of section N+1
- Add a volume ramp automation on one track over the last 2 beats of section N

## Do Not

- Apply fixes without explicit user confirmation
- Overwrite the source file without going through the draft-first convention
- Add fills, instruments, or variations beyond what the specific finding calls for
- Rewrite sections the user didn't ask about
- Audit schema-invalid compositions — stop and report the validation error instead
- Flag deliberate uniformity as a problem: ghost notes, sub-bass drones, and long held pads are *supposed* to be uniform
