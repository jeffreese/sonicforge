---
name: retro
description: "End-of-session retrospective — analyze code changes and friction for config improvements and skill candidates."
---

# /retro — Session Retrospective

Analyze the session's work to identify improvements to rules, skills, and development patterns.

## Steps

1. **Gather inputs:**
   - Read `.claude/friction.md` for friction entries captured via `/friction-log`
   - Run `git diff HEAD~5..HEAD --stat` (or appropriate range) to see what changed this session
   - Run `git log --oneline -10` for recent commit context
   - Scan the conversation for corrections, workarounds, and patterns

2. **Scan for patterns.** Look for:
   - **Coding conventions** that should become rules (e.g., "we kept having to fix import paths" → path convention rule)
   - **Repeated multi-step patterns** that should become skills or scaffolding (see "Skill Candidate Detection" below)
   - **ADR-worthy decisions** made during implementation but not captured
   - **Testing insights** (e.g., "mocking Tone.js is hard, here's what worked")
   - **Friction points** that could be reduced with better tooling or docs
   - **Convention changes** established during the session ("from now on, always...")

3. **Cross-reference existing config:**
   - Read current `.claude/rules/` — is anything outdated or contradicted by this session's work?
   - Read current `.claude/skills/` — do any skills need updating based on what we learned?
   - Check `docs/planning/adrs/` — any existing ADRs that need revision?
   - Check `CLAUDE.md` — any conventions to add or update?

4. **Classify findings into three categories:**

   ### Apply Now
   Lightweight config changes to make immediately (with user approval):
   - Add/update a rule in `.claude/rules/`
   - Update `CLAUDE.md` conventions
   - Update an existing skill
   - Capture an ADR with `/adr`

   For each: state **what** to change, **where** (file path), and **suggested content**.

   ### Skill Candidates (Flag Only)
   Recurring multi-step patterns worth codifying as reusable skills. These are flagged but NOT built during retro — creating a skill is heavier work that deserves its own session.

   For each candidate:
   - **Pattern**: What repeating sequence was observed
   - **How it played out**: When it appeared in this session
   - **Proposed skill**: Name, trigger, what it would do
   - **Verdict**: "Strong candidate" (clear pattern, high reuse) / "Worth watching" (appeared once, likely to recur) / "Skip" (too niche)

   ### Already Captured
   Findings checked and confirmed to already exist in config. List briefly to show thoroughness.

5. **Present the report.** Summary format:
   - X config updates to apply (list target files)
   - Y skill candidates flagged (Z strong, W worth watching)
   - Recommended next step

6. **Apply approved changes.** Only modify files the user confirms. Write changes, then log them to `.claude/improvements.md` with date and description.

7. **Clear friction log.** After retro is complete, archive the friction log content to `.claude/retro-archive.md` (append) and clear `.claude/friction.md`.

## Skill Candidate Detection & Tracking

This is how reusable skills like `/scaffold-feature` get discovered. Watch for:

- **The same sequence of tool calls** appearing multiple times in the session
- **Multi-step processes** where the user guided you through steps that could be one command
- **Boilerplate code** generated multiple times with slight variations
- **Verification sequences** followed manually each time (e.g., "check types, run tests, lint")
- **Pattern-following work** where you read an existing file to match its structure for a new file

### Pattern tracking with `.claude/skill-watch.md`

Patterns are tracked across sessions with observation counts. Read `.claude/skill-watch.md` at the start of retro. For each skill candidate found this session:

1. **Check if it's already tracked.** If yes, increment the count and add an observation entry.
2. **If new**, add it with count: 1 and status: "watching."
3. **Auto-elevate**: When a pattern reaches **3+ observations**, change status to "strong-candidate" and prominently flag it in the retro report:
   > "Pattern [name] has been observed 3 times now. Strong candidate for a skill. Want to codify it?"
4. **If the user creates the skill**, change status to "codified" with a link to the skill file.
5. **If the user dismisses it**, change status to "dismissed" so it's not re-flagged.

This ensures patterns get surfaced based on evidence, not just a single observation.
