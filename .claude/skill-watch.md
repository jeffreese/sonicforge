# Skill Watch Log

Patterns observed during development that may be worth codifying as skills.
Updated by `/retro`. When a pattern reaches 3+ observations, it's elevated to "strong candidate."

## Biome Auto-Fix on Write
**Count:** 1 | **First seen:** 2026-03-15 | **Last seen:** 2026-03-15
**Status:** watching
**Description:** After writing new files, Biome import ordering or formatting violations are caught by lint or pre-commit hook. Running `biome check --write` automatically on newly created files would eliminate the fix-and-retry cycle.
**Observations:**
- 2026-03-15: Hit 4 times in one session (validate.test.ts, sf-app.ts, MixerStore.ts, bridge.test.ts). Could be a post-write hook rather than a skill.
