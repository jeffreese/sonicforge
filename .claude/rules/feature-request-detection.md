# Feature Request Detection

When the user describes a new feature they want to add — phrases like "I want to add...", "we should build...", "it would be nice to have...", "can we add...", "let's add..." — suggest capturing it properly:

> "That sounds like a new feature. Want to run `/new-feature` to spec it out and add it to the backlog?"

Only suggest once per feature idea. If the user declines or says they just want to do it ad-hoc, respect that and proceed.

Don't trigger on:
- Bug fixes or corrections to existing behavior
- Refactoring or code cleanup
- Changes to existing features (that's just development)
- Features already in the backlog
