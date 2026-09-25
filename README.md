# socratic

A Claude Code plugin that stress-tests a decision or design question. It runs a moderated
adversarial debate between 2 to 5 agents and returns a plain-language recommendation.

## What's inside

| Piece | What it does |
|---|---|
| `skills/socratic` | `/socratic <question>` picks the number of debaters from the question: one advocate per real option, or one per distinct lens (`--n K` overrides). It spawns them with different stances, relays their turns until consensus, stall or loop, and translates the outcome. |
| `skills/socratic-continue` | `/socratic-continue <point>` gives a new idea or objection to the debaters from the last `/socratic` run in this session and translates the outcome again. |

The plugin is standalone. It reads no project state and writes no files.

## Install

```
/plugin marketplace add https://github.com/VanillaFairy/socratic
/plugin install socratic@vanillafairy
```

Or standalone, from this repo's own marketplace:

```
/plugin marketplace add C:\work\claude\vanillafairy\socratic
/plugin install socratic@socratic-dev
```

## Usage example

```
/socratic Should the job queue use Postgres or Redis?
```

Two options, so two advocates. They run as background agents, and your session only sees what
the moderator relays at the end. Without the shorthand, the debate between them goes roughly
like this:

> **Agent P:** Postgres. Losing a job in a crash is a bug, and Postgres writes it to disk
> before saying it's queued.
>
> **Agent R:** Redis. It's faster, and it's built for queues.
>
> **Agent P:** Postgres with `SKIP LOCKED` handles thousands of jobs a second, and we push
> hundreds. It can also enqueue a job in the same transaction as the row that caused it.
>
> **Agent R:** Redis can persist too. Turn on AOF.
>
> **Agent P:** Define "durable" first. I mean the job survives a crash once enqueue returns.
> AOF syncs once a second by default, so you can lose the last second.
>
> **Agent R:** Agreed. Syncing every write eats my speed advantage, and I still lack the
> transactional enqueue. I switch to Postgres.

Your session shows only the moderator's side: an opening line, then the result once the
debate ends.

> Using socratic: running an adversarial 2-agent debate on Postgres vs Redis for the job
> queue, then translating the outcome.
>
> **Verdict:** Postgres. Redis's own advocate switched sides. The dispute came down to what
> "durable" means: if a job must survive a crash as soon as enqueue returns, Redis loses its
> speed edge and still can't enqueue inside your transaction.
>
> **Pro:** No jobs lost in a crash. A job commits together with the row that caused it.
> `SKIP LOCKED` covers your volume with room to spare.
>
> **Contra:** Redis is still faster at volumes well beyond yours.
>
> **Outcome:** consensus after 2 clash rounds, 2 agents, advocacy.
>
> ▸ Transcript (raw exchange, folded)

Without consensus, you'd get each camp's case, the point they couldn't get past, what would
settle it, and the moderator's marked lean.

To push back with the same debaters:

```
/socratic-continue We already run Redis for caching, and ops wants one less database.
```

For open questions, each debater gets a different angle, such as risk-first against
opportunity-first:

```
/socratic How should we split the monolith's billing code? --n 3
```

