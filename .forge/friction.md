# Friction Log

Small polish items, wording fixes, and low-priority observations that don't
warrant their own plan or backlog entry. Triaged opportunistically — usually
during `/forge:session-break` or when the current plan is otherwise clear.

## 2026-04-11 — Composition-index Chunk B dogfood (batch)

1. **`/library-stats` top-tags line is hard to scan past the first five.**
   The rendered snapshot's top-tags line shows 15 entries in one space-separated
   block. Everything past the top ~5 drops to count-1, which is vocabulary
   noise rather than library shape signal. Candidate fix in `snapshot.ts`
   `renderSnapshot()`: cap at the cutoff where counts hit 1, or cap at 10 and
   replace the tail with `"… and N more modifiers"`. One small function, no
   test churn.

2. **Primary-genre gap truncation reads awkwardly at small N.** Current
   wording: `"No compositions with primary genre: house, techno, trap,
   ambient, lo-fi, and 1 more"`. With only 6 missing, listing all 6 is
   clearer than the `"and N more"` compression. Candidate fix: raise the
   truncation threshold in `computeGaps()` from `> 5` to `> 8` so small
   miss lists stay fully enumerated. Single constant change in `snapshot.ts`.

3. **Length bracket upper boundary is off by one.** The `LENGTH_BRACKETS` check
   uses `min: 97, max: Infinity`, so a 96-bar composition trips the "over 96
   bars" gap — which is pedantic, since a 96-bar track arguably *is* a long
   track. Observed on `dark-dubstep-drops` (96 bars). Candidate fix: widen
   to `min: 128` (a true "long" threshold), or convert to `min: 96` inclusive.
   Design decision on what "long" means; pick one and stick with it.
