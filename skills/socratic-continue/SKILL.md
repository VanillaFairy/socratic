---
name: socratic-continue
description: Use when the user invokes /socratic-continue — resume the MOST RECENT /socratic debate in the current session with the SAME debaters (all N of them), feed them a new idea/point/objection to chew on, run more clash rounds, and re-translate the outcome. Requires a prior /socratic (or /socratic-continue) run earlier in THIS session — the debaters live in the moderator's live agent handles only, so a fresh session with no prior run cannot resume them. A bare /socratic always starts a NEW debate from scratch; use this only to continue an existing one with fresh input.
---

# socratic-continue — throw a new bone into the last debate

Resume the **most recent `socratic` debate in the current session** with the **same
debaters** (all N of them), feeding them a new idea the user wants chewed on. You are still the **moderator**:
neutral, never a debater. The debaters already hold their full brief, their assigned `STANCE`, and
the entire prior transcript in context — you inject only the *new* point, run more rounds, judge
the stop condition again, and re-translate the delta into human-readable prose.

This is the **continuation** counterpart to `socratic`. `/socratic` starts a fresh debate;
`/socratic-continue` extends the last one. Everything the debaters say stays dense
machine-shorthand — *you* are the only translator to the human.

**Announce at start:** "Using socratic-continue — resuming the last debate with the same
agents against your new point, then re-translating the outcome."

## What this is / is not

- **Session-scoped.** It resumes agents that exist only as live background handles in *this*
  session. `socratic` writes no artifacts by design, so there is **no** persisted debater state on
  disk — once the session ends, the debaters' context is gone and this skill cannot revive them.
  Honesty about this limit is mandatory (see §5).
- **Continuation, not restart.** You must resume the SAME debater agents —
  `socratic-alpha`, `socratic-beta`, and `socratic-gamma` … `socratic-epsilon` if the run had them —
  by name or by the `agentId` from their spawn. Re-spawning fresh agents would discard
  their context and re-collapse the samples into an echo — that is a NEW debate, not a
  continuation, and defeats the purpose.
- **Advisory & read-only.** The debaters remain read-only analysts. Nothing here mutates code,
  files, or state.

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

**If you cannot** — no `socratic` debate ran earlier in this session, or the handles are
unrecoverable — **stop and say so plainly**, then offer to start a fresh `/socratic` on the
question instead. Never silently spin up new agents and pass it off as a continuation (that is
a fabricated debate — see §5 and `socratic` §8).

A resumed background agent that has gone idle is still reachable: `SendMessage` resumes it **from
its transcript** with full prior context. "Idle" ≠ "gone." Only a genuinely lost handle (or a new
session) blocks resumption.

## 3. Inject the new point as a moderator turn

The debaters already carry the shared brief and the move-tag protocol from the original spawn —
**do not resend the brief.** In a single message, `SendMessage` to **every** debater with the same
new point, framed as a moderator injection opening a fresh round:

- Lead with `CONTINUE. Moderator injecting a new consideration from the human. Treat as a fresh
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

**Rounds — clash.** After the injection round, relay verbatim exactly as in `socratic` §4 (dense
in, dense out — do not expand between debaters): each debater gets one `SendMessage` bundling the
latest message of every *other* debater, each block headed by its sender's name. All in one
message; concurrent. Collect every reply before judging.

After **every** round, evaluate the stop conditions from `socratic` §5 — **consensus** (unanimity only),
**stall** (every debater `HOLD:` in the same round), **loop** (a rebutted claim re-raised unchanged) — reading the tags then
confirming the *meaning*, not just the words. A fresh point legitimately reopens a prior
stalemate; that is the whole intent — but the moment the new point is fully metabolized and nothing
new advances, stop.

**Continuation cap: ≤ 4 clash rounds per injection** (a single new idea rarely needs more; a full
debate is what `socratic` is for). Reaching the cap is a *no-consensus* outcome — report it as
such. The skill is **re-invocable**: the user can `/socratic-continue` again with the next bone.

## 5. Re-synthesize — lead with the delta

Translate the dense outcome into relaxed, plain-language prose. Because this is a continuation, the
first thing the human wants is **what the new point changed**:

- **Did it move the needle?** State plainly whether the new point shifted any position, moved a debater between camps, broke a
  prior wash, forced a concession, or left the earlier outcome standing. If it changed nothing,
  say so — a new idea that fails to move a battle-tested debate is itself a real result.
- **Updated recommendation / crux** — the current bottom line after the injection: the new agreed
  answer (on consensus), or the camps with their `POS:` lines and the sharpened crux between each
  pair of camps (on no consensus), stated fairly — same shape as `socratic` §7.
- **New concessions & tradeoffs** — anything any debater granted or flagged in response to the
  point.
- **My tie-breaking lean** — on no consensus, your own adjudicated call, clearly marked as the
  moderator breaking the tie, never a fabricated agreement.
- **Outcome tag** — how this continuation ended (`consensus` / `stall` / `loop` / `cap`), the
  number of continuation rounds, N, and a note that it was a `continuation` of the prior run.
- **Transcript** — the raw dense exchange for this continuation, folded at the end, untranslated.
  Offer to expand on request.

## 6. Cleanup

**Leave the debaters resumable.** Unlike `socratic` §6, do **not** try to tear the agents down —
the user will likely want to `/socratic-continue` again with another idea. Idle-but-resumable is
the desired end state. (They cost nothing while idle and evaporate with the session anyway.)

## 7. Failure handling

- **No prior debate in this session / lost handles** — do not fabricate. Say the last debate can't
  be resumed (and why: fresh session, or no `socratic` run happened here), then offer a fresh
  `/socratic`.
- **A debater returns nothing / dies on resume** — resend once. If it still fails, continue with
  the surviving debaters and **say so** in the synthesis; if only one survives, report its view as a
  single voice. A thinned continuation is honest; a faked full one is not.
- **Never fabricate consensus or a debate.** If the continuation stalls, loops, or caps, report
  exactly that.

## Notes

- The debaters inherit the model and stances of the original run — no re-differentiation needed,
  and none wanted; re-differentiating would erase the history that makes a continuation worth more
  than a restart.
- A continuation is cheap precisely because the expensive part (building every case from scratch)
  already happened. Its value is *marginal*: does this one new consideration survive contact with a
  debate that already reached its crux?
