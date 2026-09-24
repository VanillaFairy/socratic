# socratic

A Claude Code plugin that stress-tests a decision or design question with a moderated
adversarial debate between two agents, then hands back a plain-language recommendation.

## What's inside

| Piece | What it does |
|---|---|
| `skills/socratic` | `/socratic <question>` — differentiates and spawns two debaters, relays their turns until consensus, stall or loop, and translates the outcome. |
| `skills/socratic-continue` | `/socratic-continue <point>` — feeds a new idea or objection to the same two debaters from the last `/socratic` run in this session and re-translates. |

The plugin is standalone: it reads no project state and writes no files.

## Install

```
/plugin marketplace add C:\work\claude\vanillafairy
/plugin install socratic@vanillafairy
```
