---
name: compose
description: "Generate a new SonicForge composition from a natural language description."
allowed-tools: Read, Write, Glob
---

# /compose — Generate a New Composition

## Steps

1. **Parse the request.** Extract genre/mood, instruments, BPM, key, structure, length. Fill in sensible defaults for anything not specified.

2. **Load reference material.** Read these files before generating:
   - `.claude/skills/compose/gm-samples.md` — valid instrument sample names
   - `.claude/skills/compose/genre-guide.md` — genre conventions, progressions, drum patterns

3. **Ask clarifying questions only if the request is very vague** (e.g., bare "/compose"). If there's enough to work with, generate directly.

4. **Generate the composition JSON.** Follow the `composition-format` and `music-theory` rules. Key principles:
   - Write every note — no placeholders or "repeat" comments
   - Vary velocity across notes
   - Build energy across sections (add instruments, raise dynamics)
   - Keep instruments in their natural registers
   - Ensure harmonic consistency across simultaneous instruments

5. **Write the JSON** to `compositions/<descriptive-name>.json`

6. **Briefly describe what you created** — title, key, BPM, instruments, section overview. A few sentences max.

## Quality Checklist

Before outputting, verify:
- `version` is `"1.0"`
- All `instrumentId` references match an instrument `id`
- Note times don't exceed section bar counts
- Velocity varies naturally
- Bass in C1–G3, melody in C4–C6
- Drum tracks use named hits, not pitches
- Dynamic contrast between sections
- No empty sections or tracks
