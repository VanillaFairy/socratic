---
name: socratic-continue
description: Use when the user invokes /socratic-continue — resume the MOST RECENT /socratic debate with the SAME debaters (all N of them), feed them a new idea/point/objection to chew on, run more clash rounds, and re-translate the outcome. Within the session that ran the debate it resumes the live debaters; in a later session it rebuilds them from the debate log under ~/.socratic/runs/ and says so. A bare /socratic always starts a NEW debate from scratch; use this only to continue an existing one with fresh input.
---

# socratic-continue — throw a new bone into the last debate

Resume the **most recent `socratic` debate** with the **same debaters** (all N of them), feeding
them a new idea the user wants chewed on. You are still the **moderator**: neutral, never a
debater. Live debaters already hold their full brief, their assigned `STANCE`, and the entire
prior transcript in context; rebuilt ones get the brief at spawn and read the transcript from the
log. Either way you inject only the *new* point, run more rounds, judge the stop condition again,
and re-translate the delta into human-readable prose.

This is the **continuation** counterpart to `socratic`. `/socratic` starts a fresh debate;
`/socratic-continue` extends the last one. Everything the debaters say stays dense
machine-shorthand — *you* are the only translator to the human.

**Announce at start:** "Using socratic-continue — resuming the last debate with the same
agents against your new point, then re-translating the outcome."

## What this is / is not

- **Live in-session, rebuilt across sessions.** In the session that ran the debate, the debaters
  are live background handles with their full context. Once that session ends, the context is
  gone; what survives is the run's log, `debate.md` plus `rounds/`. From it you rebuild the
  debaters as fresh agents that read the old transcript (§2). A rebuilt debater has read the
  debate, not lived it, and you say so (see §5).
- **Continuation, not restart.** In-session, resume the SAME debater agents —
  `socratic-alpha`, `socratic-beta`, and `socratic-gamma` … `socratic-epsilon` if the run had them —
  by name or by the `agentId` from their spawn. Fresh agents without the transcript would
  re-collapse the samples into an echo — that is a NEW debate, not a continuation, and defeats the
  purpose.
- **Advisory & read-only.** The debaters remain read-only analysts, apart from their own log files.
  Nothing here mutates code or project state.

---

## 1. Resolve the new point

The new point is the `/socratic-continue` argument — the fresh idea, objection, reframe, or datum
the user wants the debaters to metabolize. If the argument is empty, **ask once** for the point;
do not resume the debate against a null idea. State the new point to yourself in one sentence
before relaying it.

You do **not** re-resolve the original question or re-pick a divergence mechanism — the debate
already has both. The debaters keep their existing stances; the new point simply enters as fresh
evidence every debater must answer.

## 2. Locate the prior debate and its agents

From this session's context, recover every debater agent from the most recent `socratic` (or
prior `socratic-continue`) run — its N, their names (`socratic-alpha` onward) and/or their
`agentId`s, and any debater that had already failed in that run. You will `SendMessage` to those
exact handles; a debater that failed earlier stays out.

Recover its run directory too: new rounds go into the same `rounds/`, numbered on from the last
one, and the continuation's result is appended to the same `debate.md` under
`## Continuation: <the new point>`.

**Rebuild from the log** when no `socratic` debate ran in this session, the handles are
unrecoverable, or the user names an older run. Take the newest run under `<home>/.socratic/runs/`
unless the user names one. Re-spawn each debater listed in `debate.md`, except those it records
as failed, exactly as `socratic` §3 spawns it, with the same brief, STANCE, model and `{{RUN}}`.
Its spawn message is the injection of §3 with one line added after `ROUND <RR>`: `REBUILT. This
message names every file in {{RUN}}/rounds/: list and read them all, then answer the new point below as the
analyst you were.` Announce it as a rebuilt continuation, not a resumed one.

**If there is no log either**, **stop and say so plainly**, then offer to start a fresh
`/socratic` on the question instead. Never silently spin up new agents and pass it off as a
continuation (that is a fabricated debate — see §5 and `socratic` §9).

A background agent that has gone idle, or that `socratic` §7 stopped, may still resume from its
transcript on `SendMessage`. Try it. If any debater's handle doesn't resume, rebuild the whole
panel from the log rather than mix live and rebuilt debaters. On a partial resume, the rebuilt
panel gets the same `ROUND <RR>` and overwrites the files the resumed debaters wrote, and those
handles get no further messages.

## 3. Inject the new point as a moderator turn

The debaters already carry the shared brief and the move-tag protocol from the original spawn —
**do not resend the brief** (a rebuilt debater got it at spawn). In a single message, `SendMessage` to **every** debater with the same
new point, framed as a moderator injection opening a fresh round:

- Lead with `ROUND <RR>` (the next round number), then `CONTINUE. Moderator injecting a new consideration from the human. Treat as a fresh
  round; respond per protocol (CONCEDE@ / OBJ@ / REVISE / restate POS), or HOLD if genuinely nothing
  new.`
- Then the new point, in the same **dense shorthand** the debate runs in — one claim per line,
  symbols where they compress, fidelity absolute (never drop a premise that changes the
  conclusion). If the point cuts differently against each side, you may tailor the *framing* of the
  cut per debater (as you would relay an opponent's turn), but the **substance must be identical** —
  never feed the agents materially different ideas.
- Ask each to **restate POS** after addressing it.

Send all in one message so they run concurrently. Collect **every** reply before judging.

## 4. Run the continuation loop

**Rounds — clash.** After the injection round, relay exactly as in `socratic` §4: each debater gets
one short `SendMessage` pointing at every *other* debater's latest round file. All in one message;
concurrent. Collect every reply before judging.

After **every** round, evaluate the stop conditions from `socratic` §5 — **consensus** (unanimity only),
**stall** (every debater `HOLD:` in the same round), **exhausted** (a round adds nothing new), **loop** (a rebutted claim re-raised unchanged) — reading the tags then
confirming the *meaning*, not just the words. A fresh point legitimately reopens a prior
stalemate; that is the whole intent — but the moment the new point is fully metabolized and nothing
new advances, stop.

Once a stop condition fires, run the closing round of `socratic` §6 on the load-bearing claims this
continuation introduced or changed. Claims verified in an earlier run stay verified.

After every round, run the ledger of `socratic` §5, which lives in that skill, not this one:
`node <this skill's base directory>/../socratic/scripts/ledger.mjs <run dir> --cap <injection round + 4>`.

**Continuation cap: ≤ 4 clash rounds per injection** (a single new idea rarely needs more; a full
debate is what `socratic` is for). Reaching the cap is a *no-consensus* outcome — report it as
such. The skill is **re-invocable**: the user can `/socratic-continue` again with the next bone.

## 5. Re-synthesize — lead with the delta

Translate the dense outcome into relaxed, plain-language prose. Because this is a continuation, the
first thing the human wants is **what the new point changed**. Everything above the outcome tag
stays within **150 words** on consensus and **250 words** without it.

- **Did it move the needle?** State plainly whether the new point shifted any position, moved a debater between camps, broke a
  prior wash, forced a concession, or left the earlier outcome standing. If it changed nothing,
  say so — a new idea that fails to move a battle-tested debate is itself a real result.
- **Updated recommendation / crux** — the current bottom line after the injection: the new agreed
  answer (on consensus), or the camps with their `POS:` lines and the sharpened crux between each
  pair of camps (on no consensus), stated fairly — same shape as `socratic` §8.
- **New concessions & tradeoffs** — anything any debater granted or flagged in response to the
  point.
- **My tie-breaking lean** — on no consensus, your own adjudicated call, clearly marked as the
  moderator breaking the tie, never a fabricated agreement.
- **Outcome tag** — how this continuation ended (`consensus` / `stall` / `exhausted` / `loop` / `cap`), the
  number of continuation rounds, N, and a note that it was a `continuation` of the prior run, or a
  `rebuilt` one.
- **Log** — the run directory's path. Don't paste the transcript; offer to translate any part of
  it on request.

## 6. Cleanup

**Leave the debaters resumable.** Unlike `socratic` §7, do **not** try to tear the agents down —
the user will likely want to `/socratic-continue` again with another idea. Idle-but-resumable is
the desired end state. (They cost nothing while idle and evaporate with the session anyway.)

## 7. Failure handling

- **No live debaters and no log** — do not fabricate. Say the last debate can't be resumed (and
  why: no `socratic` run happened here, and no run directory exists), then offer a fresh
  `/socratic`.
- **A debater returns nothing / dies on resume** — resend once. If it still fails, continue with
  the surviving debaters, mark it failed in `debate.md`, and **say so** in the synthesis; if only one survives, report its view as a
  single voice. A thinned continuation is honest; a faked full one is not.
- **Never fabricate consensus or a debate.** If the continuation stalls, loops, or caps, report
  exactly that.

## Notes

- The debaters keep the models and stances of the original run — no re-differentiation needed,
  and none wanted; re-differentiating would erase the history that makes a continuation worth more
  than a restart.
- A continuation is cheap precisely because the expensive part (building every case from scratch)
  already happened. Its value is *marginal*: does this one new consideration survive contact with a
  debate that already reached its crux?
