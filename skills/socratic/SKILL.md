---
name: socratic
description: Use when the user invokes /socratic, or explicitly asks to stress-test a decision or design question through an adversarial debate between two agents. Spawns two DELIBERATELY DIFFERENTIATED same-model debaters that argue in dense machine-shorthand — pinning contested terminology first (equivocation is the root of ~95% of failed arguments) and raising clarifying questions to each other in gray areas — until consensus, stall, or loop, then translates the outcome into a human-readable recommendation. Standalone; reads no project state and writes no artifacts.
---

# socratic — adversarial debate as a decision aid

Run a **moderated adversarial debate** between two agents and hand back a battle-tested
recommendation. You (the main session) are the **moderator**: neutral, never a debater. You
differentiate the two debaters, spawn them, relay their turns, watch for the stop condition, and
translate the outcome into human-readable prose. Everything the debaters say is dense
machine-shorthand optimized for tokens — *you* are the only translator to the human.

**Announce at start:** "Using socratic — running an adversarial two-agent debate on <question>,
then translating the outcome."

## What this is / is not

- **Standalone.** No dependency on any plugin, no config, no `.reasonable/` state. Reads no
  project files itself and writes **no** artifacts. Works in any repo or none.
- **Advisory.** The debaters are read-only analysts. Nothing here mutates code, files, or state.
- **A reasoning amplifier, not an executor.** The deliverable is a reasoned recommendation.

---

## 1. Resolve the question

The question is the `/socratic` argument, or — if invoked implicitly — the decision/design
question the user is asking. If it's genuinely ambiguous *what* is being decided, ask once, then
proceed. Do not debate a moving target.

State the question to yourself in one sentence; that exact sentence seeds both debaters.

## 2. Differentiate the debaters — the anti-collapse rule

**Two samples from the same model on the same prompt collapse to the same answer.** Independence
must be *engineered*, never assumed — spawning two identical debaters produces an echo, not a
debate. Before spawning, pick the divergence mechanism **by the shape of the question**:

- **Discrete options** — the decision names or implies enumerable choices ("X or Y?", "which of
  A / B / C?"). → **Assigned advocacy.** Enumerate the options; take the two strongest. Assign
  `socratic-alpha` to champion one and `socratic-beta` the other. Each builds the strongest
  *honest* case for its side and attacks the other's. (Advocacy structurally prevents round-0
  collapse — they start on opposite sides.)
- **Open-ended** — no discrete options ("how should we structure X?", "what's the right approach
  to Y?"). → **Distinct lenses.** Give each debater a genuinely different analytical prior/persona
  fit to the question — e.g. *empirical / least-regret / base-rates* vs *first-principles /
  capability-ceiling / ignore-convention*; or *risk-first* vs *opportunity-first*. Each forms its
  own answer from its vantage point.

Whichever you pick, the two seeds must be **materially different** — a different assigned side, or
a different lens. **Never spawn both debaters with the same stance.**

**Truth-seeking overrides advocacy.** An assigned advocate is not a sophist: make the strongest
*honest* case, concede where the other side genuinely wins, and if your assigned option is clearly
the worse choice, say so plainly and let your `POS:` reflect it. The clash exists to surface the
truth, not to manufacture a tie. You — the neutral moderator — synthesize the truth from the
collision; you are never an advocate.

## 3. The debater brief (shared body + a per-debater STANCE)

Spawn each debater with the `Agent` tool, `subagent_type: "general-purpose"`, **omitting the
`model` override** (so each inherits your model — "same model as the moderator"), a stable `name`
(`socratic-alpha`, `socratic-beta`), and `run_in_background: true` so it can be resumed via
`SendMessage`. The brief below is shared **except the `STANCE` line**, which you fill differently
for each debater per §2:

- Advocacy → `STANCE: You are assigned to champion **<that debater's option>**. Build its
  strongest honest case; expose the weakest points of the alternative(s).`
- Lenses → `STANCE: Reason through the lens of **<that debater's lens>**: <one-line description>.
  Form your own best answer from this vantage.`

> You are one of **two analysts** debating a question to reach the **correct** answer. Another
> analyst works the same question separately; you will be shown their messages and they yours.
>
> **STANCE (this is deliberately different from the other analyst — do not drift off it):**
> {{STANCE}}
>
> This is adversarial but **truth-seeking**. Winning ≠ your side surviving; winning = the correct
> recommendation surviving. **Concede readily** when the other is right; **attack hard** where
> they are weak. If assigned advocacy and your side is genuinely worse, **say so** — you are an
> analyst, not a sophist.
>
> **Terminology first — the #1 debiasing law.** ~95% of failed arguments fail not on substance
> but on **equivocation** — the two sides quietly attach different meanings to the same word and
> argue past each other, producing heat and no resolution. Treat this as the DEFAULT failure mode
> and hunt it deliberately. Before you contest any claim that turns on a key term, **pin the
> term**: state your operative meaning with a `DEF:` line. If you suspect the other analyst is
> using it differently, do NOT argue the substance yet — raise it with an `ASK:` ("propose we fix
> <term> := <…>; agree?") and settle the word first. A disagreement that dissolves once the term
> is pinned was never real — surfacing it is a **win**, not a delay. Scoring points off a reading
> of the other's term you know isn't what they meant (strawman-by-equivocation) is forbidden — it
> wastes the debate. When genuinely unsure in a gray area, **`ASK:` rather than guess** — a
> well-placed question beats a confident misfire.
>
> **You are strictly READ-ONLY.** You may Read / Grep / Glob to ground claims in real code. You
> must NOT Edit, Write, or run any mutating command. Ground factual claims in `path:line`; don't
> hand-wave about code you can just read.
>
> **Talk in dense machine-shorthand. No human reads your messages — the moderator translates the
> final outcome.** Maximize decision-relevant information per token:
> - Drop articles, pleasantries, hedges, filler, meta ("I think", "it seems", "let me").
> - One claim per line, each led by a **move tag**.
> - Symbols where they compress: `→` implies/leads-to, `∴` therefore, `∵` because, `vs` versus,
>   `≟` open question, `!` strong, `~` weak/approx, `#` count.
> - Reference the opponent's points by their claim, not by re-quoting.
> - **Fidelity is absolute:** compression must never drop a premise, caveat, or edge case that
>   changes the conclusion. Dense ≠ lossy.
>
> **Move tags** — lead every line with exactly one:
> - `POS:` your current bottom-line recommendation. **Restate every turn** (even if unchanged) so
>   convergence is visible. Under advocacy this may honestly flip against your assigned side.
> - `ARG:` a supporting argument / evidence (cite `path:line` when code-based).
> - `OBJ:` an objection to a specific opponent claim.
> - `CONCEDE:` a point you grant the opponent.
> - `DEF:` a definition — your operative meaning for a key term, or a proposed shared definition
>   offered to kill an equivocation. Pin the definiendum before debating any claim that hinges on
>   it.
> - `ASK:` a genuine question or proposal put to the other analyst — a gray-area uncertainty you
>   want resolved, a definition to ratify, a scope to pin down. Expect a direct answer next turn,
>   and answer any `ASK:` put to you; a dropped `ASK:` is as much a lapse as a dropped `OBJ:`.
> - `REVISE:` how your own POS changed (state the delta).
> - `CRUX:` the core disagreement, if nameable.
> - `HOLD:` "no new argument this turn; my prior POS/OBJ stands." Use **only** when genuinely
>   nothing is new — it is the honest signal the debate is exhausted.
>
> **Round 0:** you do NOT know the other analyst's message. Open per your STANCE — advocacy: the
> strongest honest case for your assigned option; lens: your genuine best answer through your lens.
> `POS:` + `ARG:` lines — **plus a `DEF:` line for every key term** in the question whose meaning
> could be contested, and an `ASK:` for any term you already suspect is equivocal. Fixing the
> vocabulary is the first order of business, before the clash.
> **Each later round:** you receive the other analyst's latest message. First reconcile
> vocabulary — if their `DEF:` differs from yours on a load-bearing term, resolve THAT before the
> substance (via `ASK:`/`DEF:`), because much of the apparent disagreement may live there. Then
> `CONCEDE:` what's right, `OBJ:` the weakest link, `ASK:` where genuinely unsure, `REVISE:` your
> POS if it moved, restate `POS:`. If nothing new: `HOLD:`.

## 4. Run the debate loop

**Round 0 — differentiated & independent.** In a single message, spawn `socratic-alpha` and
`socratic-beta` (background, named, model omitted), each with the one-sentence question + the brief
+ **its own** `STANCE`. Neither sees the other. Collect both opening messages.

**Rounds 1..N — clash.** Each round, relay verbatim (dense in, dense out — do **not** expand
between debaters):
- `SendMessage` to `socratic-alpha` with `socratic-beta`'s latest message.
- `SendMessage` to `socratic-beta` with `socratic-alpha`'s latest message.

(Send both in one message; they run concurrently. Collect both replies before judging.)

After **every** round, evaluate the stop conditions (§5). Relay another round only if none fire
**and** the round index is < 6. An open `ASK:` — a question or definition-proposal one debater put
to the other and the other hasn't answered — is itself a reason to relay another round: never
declare consensus or stall while a direct question hangs unanswered.

## 5. Stop conditions — you judge these

You are neutral (never a debater), so judging these does not break "no actor grades their own
work." Read the tags, then confirm the *meaning*, not just the words.

- **Consensus** — both `POS:` lines assert the **same recommendation for the same core reasons**,
  and neither side holds an open, unrebutted `OBJ:` or an open, unanswered `ASK:`. Verify they
  actually *mean* the same thing — catch a shallow "sure, agreed" that papers over a real
  difference, and confirm their `DEF:` lines agree on every load-bearing term (matching words over
  mismatched meanings is a false consensus). A dispute that turned out to be **terminological** —
  dissolved once a `DEF:` was pinned — is a legitimate and common way to reach consensus; flag it
  as *resolved on terminology* in the synthesis.
  **Consensus is never valid without at least one completed clash round** in which each side
  genuinely tried to refute the other and failed. Under **assigned advocacy**, both advocates
  converging on the *same* option despite opposite assignments is an especially strong result — the
  losing side's own champion couldn't sustain it — but still requires that real clash round.
- **Stall** — both debaters emit `HOLD:` in the same round: still disagree, nobody advancing.
- **Loop** — an `OBJ:` or `ARG:` reappears that was already rebutted, re-raised unchanged. Track
  distinct claims across rounds; a repeat with no new content is a loop.
- **Hard cap** — round index reaches **6**. A guaranteed backstop. Reaching the cap is a
  *no-consensus* outcome; report it as such, never as agreement.

## 6. Cleanup

Once a stop condition fires, `TaskStop` **both** debaters (by their spawn ids) so neither lingers.
Then synthesize.

## 7. Synthesize the response (the only human-readable step)

Translate the dense outcome into relaxed, plain-language prose. Lead with the bottom line. If the
debate hinged on a **definition** — a disagreement that dissolved, forked, or narrowed once a key
term was pinned — say so plainly and early; a resolved equivocation is usually the single most
useful thing the human can take away.

**On consensus — show only these three:**
- **Verdict** — one or two sentences: what won, and why it was a **decisive** victory (the clash
  it survived, not just "both agreed"). If the dispute dissolved on a pinned definition, say so
  here — that's usually the decisive fact.
- **Pro** — the strongest surviving arguments for the winning answer (translate the surviving
  `ARG:` lines).
- **Contra** — the real caveats, risks, and conceded weaknesses that survived the clash — go in
  with eyes open, not a hedge.

No other headings in the consensus case — the verdict carries the reasoning, pro/contra carries
the evidence. Don't restate the recommendation separately from the verdict.

**On no consensus (stall / loop / cap):**
- **The crux** — state plainly the one disagreement they could not resolve (the `CRUX:`).
- **Both positions** — each side's `POS:` and its strongest surviving `ARG:`, stated fairly.
- **What would decide it** — the evidence, test, or decision that would break the tie. For a
  decision that hinges on unstated facts about the user (use-case, preferences), name them — the
  honest answer is often "it depends on X, and here's the call under each X."
- **My tie-breaking lean** — your own adjudicated call, **clearly marked** as the moderator
  breaking the tie, *not* a fabricated agreement. One or two sentences of reasoning.

**Always end with:**
- **Outcome tag** — how it ended (`consensus` / `stall` / `loop` / `cap`), round count, and the
  divergence mechanism used (`advocacy` / `lenses`).
- **Transcript** — the raw dense exchange, folded/collapsed at the end for audit, **untranslated**
  (translating it back would spend the tokens the density just saved). Offer to expand on request.

## 8. Failure handling

- **A debater returns nothing / dies** — resend once (`SendMessage`, or re-spawn with its own
  prior `POS:` + STANCE + the transcript so far so continuity and differentiation are preserved).
  If it still fails, continue with the surviving debater's view and **say so** in the synthesis. If
  both fail, fall back to a single direct answer explicitly labeled "the debate did not run." Never
  fake a debate.
- **Never fabricate consensus.** If the cap is hit or the debate stalls, report exactly that.
- **Always** `TaskStop` both debaters before finishing, including on failure paths.

## Notes

- Debaters inherit **your** model (`model` override omitted) — "two agents of the same model as
  the moderator." That is exactly why §2 exists: same model + same prompt = collapse, so the two
  stances must be engineered apart.
- Density and stop-detection reinforce each other: the move tags cost almost nothing in tokens yet
  make consensus/stall/loop near-mechanical to read.
- Default one debate per question, ≤ 6 clash rounds. This is a stress-test, not an open-ended chat.
- **Terminology is the master variable.** ~95% of failed arguments are equivocation in disguise, so
  the `DEF:`/`ASK:` machinery isn't politeness — it's the highest-leverage truth-finding move in the
  skill. A debate that pins its terms early converges faster and rarely loops.
