# socratic

A Claude Code plugin that stress-tests a decision or design question with a moderated
adversarial debate between 2–5 agents, then hands back a plain-language recommendation.

## What's inside

| Piece | What it does |
|---|---|
| `skills/socratic` | `/socratic <question>` — picks N from the question's shape (one advocate per real option, or distinct lenses; `--n K` overrides), differentiates and spawns the debaters, relays their turns until consensus, stall or loop, and translates the outcome. |
| `skills/socratic-continue` | `/socratic-continue <point>` — feeds a new idea or objection to the same debaters from the last `/socratic` run in this session and re-translates. |

The plugin is standalone: it reads no project state and writes no files.

## Install

```
/plugin marketplace add C:\work\claude\vanillafairy
/plugin install socratic@vanillafairy
```
