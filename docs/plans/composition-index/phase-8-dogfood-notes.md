# Composition Index — Phase 8 Dogfood Notes

**Status: session artifact, not a roadmap.** These are raw observations from
the dogfood session that validated Chunk B. Action items for future work have
been routed to their appropriate homes:

- **Blocking plan tasks** → `docs/plans/composition-index/tasks.md`
- **New feature ideas** → `docs/plans/backlog.md` (see `composition-index-polish`)
- **Small polish + wording fixes** → `.forge/friction.md`

Future readers: don't try to execute from this file. It's a record of what
happened during the dogfood run, kept for retro purposes.

## `/library-stats` — first run

**What worked:**

- Pre-rendered `snapshot.txt` consumption is instant — skill reads a few
  hundred bytes, prints verbatim, done.
- Fenced code block preserves alignment; nothing wraps unexpectedly.
- Demo-filter footer is honest and unobtrusive.
- Positive framing holds across every gap string.

**Follow-up candidates (not blocking):**

1. **Top-tags line is hard to scan past the first five.** Everything after
   the first few entries drops to count-1, which is vocabulary noise rather
   than library shape signal. Candidate fix: cap the top-tags line at the
   cutoff where counts hit 1, or explicitly show top 10 with the count-1
   tail hidden behind a "… and N more modifiers" summary.
2. **"dark" is the loudest single signal in the library** (9/17 tracks) but
   never surfaces as a gap because the hardcoded `PRIMARY_GENRES_TO_CHECK`
   list only covers genres, not moods. Probably the most actionable
   diversification cue in the report — "the library is mostly dark tracks"
   is a real pull on new work. Candidate fix: add a second dimension to
   `computeGaps()` that flags mood dominance when one mood tag exceeds ~50%
   of the library. Positive-framed: "opportunity for bright / uplifting /
   playful / warm compositions."
3. **Primary-genre gap truncation reads awkwardly at small N.** Current:
   `"house, techno, trap, ambient, lo-fi, and 1 more"`. With only 6 missing,
   listing all 6 is clearer than the "and N more" compression. Candidate fix:
   raise the truncation threshold in `snapshot.ts` from 5 to ~8 so small
   miss lists stay fully enumerated.
4. **Length brackets are a bit arbitrary at the boundary.** 96-bar
   `dark-dubstep-drops` trips the "over 96 bars" gap (bracket is
   `min: 97, max: Infinity`), which feels pedantic — a 96-bar track arguably
   *is* a long track. Candidate fix: widen brackets or use "≥" bound logic.

## `/compose "make me a song"` — underspecified request

**Result:** `compositions/halflight.json` — melodic trap in F major at 142 BPM,
40 bars, 1191 notes. Six sections (intro, A, B, A′, B′, outro).

**Gap-driven direction:** zero user constraints → spec-level detection correctly
classified as underspecified → integrated gaps silently. The direction that
emerged hit three gaps at once — missing `trap` primary genre, missing `trap`
drum pattern, and near-absent major keys (1/17). After the write, the
regenerated snapshot showed all three gaps resolved: library is now 18 tracks
with `trap (1)` primary, `trap (1)` drum pattern, and `F (1)` major key added
to the distribution.

**What worked:**

- The snapshot step felt natural to apply — read, classify, choose direction,
  continue. No awkward "how do I apply this" beat.
- Silent integration held. The user-facing summary described the track without
  mentioning the gap reasoning once.
- The pre-rendered `snapshot.txt` gave me exactly the aggregates I needed
  without parsing entry-level data. Efficiency win confirmed in practice.
- Double-gap convergence (trap primary + trap drum pattern) was a clean signal
  — unambiguous direction from the gap list alone.

**Friction and observations:**

1. **Draft-first rule conflict with the PostToolUse hook.** *(Routed:
   `tasks.md` as a new Phase 6 task — blocking.)* The composition-drafts rule
   accepts `cp`, Claude `Write`, or any atomic single-operation as the final
   step. But the PostToolUse hook only fires on Claude's `Write` tool, not on
   `cp`. I used `cp` and the snapshot went stale; had to `pnpm rebuild:index`
   manually to surface the new track. If every composer does this the
   hook-maintained index drifts silently. Fix: tighten the rule to require the
   Claude `Write` tool for the final step.

2. **Double-gap weighting is intuitive but not encoded.** *(Routed:
   `composition-index-polish` backlog entry.)* I reached for trap partly
   because it was missing on two dimensions at once. If a future gap list has
   several single-dim gaps and one double-dim gap, a less careful pass might
   miss the weighted value. Candidate: mark cross-dimension gaps in the
   rendered output (`★` or similar) so the signal is visible.

3. **Mood dominance isn't a gap.** *(Routed: `composition-index-polish`
   backlog entry.)* `dark (9)` was the loudest single signal in the snapshot —
   more than half the library — but never surfaced as a gap because the
   hardcoded dimension list only checks primary genres and drum patterns, not
   moods. Probably the most actionable diversification cue in the whole
   report. Candidate: add a mood-dominance check to `computeGaps()` that flags
   when one mood tag exceeds ~50% of the library and names under-represented
   moods as positive opportunities.

4. **1191 notes on 40 bars feels right.** Most of it is 16th hi-hats through
   the `trap()` helper. The helper's built-in velocity variation made the
   rigidity pass clean — no adjustments needed. Not actionable, just confirms
   the helper library is pulling its weight.

5. **Hook did fire correctly during the scratch-script `npx tsx` run** — that
   was a Bash invocation which doesn't trigger the hook (matcher is `Write`),
   so the draft write to `/tmp/` was silent. Only the final `cp` *would have*
   fired had it been a `Write`. This is consistent with item 1 and the fix is
   the same.

## `/compose "a brooding techno track in A minor at 130 BPM"` — specified request

**Result:** `compositions/hollow-machine.json` — brooding minimal techno in A
minor at 130 BPM, 48 bars across 6 sections. 942 notes. Dub-techno influenced
(slow modal progression Am|Am|Am|Am|F|F|G|G, sidechained drone, kick-less
break, hypnotic stab). Distinguished from the library's existing dark-techno
/ industrial-techno / melodic-techno through the minimal/hypnotic direction.

**Spec-level detection verified:** request named 4 explicit constraints
(genre + key + BPM + mood). Classified as specified. All four held in the
output: techno ✓, A minor ✓, 130 BPM ✓, brooding mood ✓. No gap-driven
override of the explicit request. The snapshot was used only for authorial
awareness ("how do I distinguish this from the three existing techno
variants?") — not for direction-setting.

**What worked:**

- Silent integration held again — no mention of snapshot reasoning in the
  user-facing summary.
- The "respect specified constraints fully" rule was unambiguous in
  application. I never felt pulled toward overriding the user's explicit
  request with a gap, even though the snapshot was visible.
- Authorial awareness from the snapshot *helped* rather than conflicted —
  knowing the library already has three adjacent techno variants nudged me
  toward a distinct personality (minimal/dub-influenced) rather than a fourth
  interchangeable dark-techno track. This is an under-documented positive use
  of the snapshot that isn't mentioned in the skill instructions.

**Friction and observations:**

1. **`computeGaps()` reports `techno` as missing despite 3 techno variants
   in the library.** *(Routed: `composition-index-polish` backlog entry.)*
   The check does exact string match against `PRIMARY_GENRES_TO_CHECK`, so
   `dark-techno`, `industrial-techno`, and `melodic-techno` don't count as
   covering `techno`. Either fold `*-techno` into coverage, or tighten the
   gap message to clarify exact-match semantics. Affects all compound-genre
   entries (house ← deep-bass-house, trance ← progressive-trance, etc.).

2. **Large compositions expose a wrinkle in the draft-first rule fix.** The
   hollow-machine composition is 150KB. The fix I originally sketched ("use
   Claude's `Write` tool for the final atomic step") doesn't scale — Write
   tool content passes through the model's output channel and 150KB of JSON
   would burn enormous context. *(Routed: updated the `tasks.md` task
   description to target a `pnpm finalize-composition <slug>` helper script
   that does `cp + update.js` in one atomic shell step. Preserves the hook
   contract without forcing large files through the model's output.)* The
   design direction is cleaner than my first take — explicit command, one
   source of truth, self-documenting contract across skills.

3. **Snapshot as authorial context, not just diversification signal.** The
   skill instructions frame the snapshot as a diversification input for
   underspecified requests. But during this specified-request run I used it
   as authorial context — to distinguish my output from adjacent existing
   work. That's a legitimate positive use the skill doesn't currently
   describe. Candidate: mention "even for specified requests, the snapshot
   is useful for authorial awareness — distinguishing your output from
   adjacent existing work without overriding explicit constraints" as a
   secondary note in `/compose` step 2. Minor skill edit.

4. **Automation worked as expected** — the filter sweep across build → main
   A → break → main B → outro gave the track a clear arc. Worth noting for
   the retro: this was the first composition I authored that uses composition-
   level automation meaningfully, not just as an EDM genre-template checkbox.


