---
paths:
  - "src/schema/**"
---

# Schema Changes Are High-Risk

The composition JSON schema (`src/schema/composition.ts`) is the contract between the app and Claude's composition skills. Changes here affect both sides.

When modifying schema files:

1. **Update Claude skills.** Check `.claude/rules/composition-format.md` and `.claude/skills/compose/` — do they reference fields or structures that changed?
2. **Validate existing compositions.** Run any compositions in `compositions/` through the updated validator to ensure backwards compatibility.
3. **Update stores.** CompositionStore types must match the schema.
4. **Flag in your commit message.** Prefix with `schema:` so it's easy to find schema changes in git history.

If adding new fields, prefer optional fields with defaults to maintain backwards compatibility with existing compositions.
