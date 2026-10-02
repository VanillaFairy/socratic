---
name: socratic
description: Use when the user invokes /socratic, or explicitly asks to stress-test a decision or design question through an adversarial debate between agents. Spawns 2–5 DELIBERATELY DIFFERENTIATED debaters (one model, or mixed model families where the host offers them) — one advocate per real option, or distinct lenses for open questions — that argue in dense machine-shorthand, pinning contested terminology first (equivocation is the root of ~95% of failed arguments) and raising clarifying questions to each other in gray areas, until unanimous consensus, stall, or loop, then translates the outcome into a human-readable recommendation. Standalone; reads no project state and keeps a log of each debate under ~/.socratic/runs/.
---

# socratic — adversarial debate as a decision aid

Run a **moderated adversarial debate** between N agents (2 ≤ N ≤ 5) and hand back a
battle-tested recommendation. You (the main session) are the **moderator**: neutral, never a
debater. You pick N, differentiate the debaters, spawn them, relay their turns, watch for the stop
condition, and translate the outcome into human-readable prose. Everything the debaters say is
dense machine-shorthand optimized for tokens — *you* are the only translator to the human.

**Announce at start:** "Using socratic — running an adversarial N-agent debate on <question>,
then translating the outcome." (Say the actual N.)

## What this is / is not

- **Standalone.** No dependency on any plugin, no config, no `.reasonable/` state. Reads no
  project files itself. Writes only its own debate log, under `~/.socratic/runs/`. Works in any
  repo or none.
- **Advisory.** The debaters are read-only analysts, apart from their own log files. Nothing here
  mutates code or project state.
- **A reasoning amplifier, not an executor.** The deliverable is a reasoned recommendation.

---

## 1. Resolve the question

The question is the `/socratic` argument, or — if invoked implicitly — the decision/design
question the user is asking. If it's genuinely ambiguous *what* is being decided, ask once, then
proceed. Do not debate a moving target.

A `--n K` flag in the argument (2 ≤ K ≤ 5) fixes the number of debaters; strip it from the
question. Without it, you pick N in §2. A `--yes` flag skips the plan card at the end of §2; strip
it too.

State the question to yourself in one sentence; that exact sentence seeds every debater.

**Gate — is a debate worth it?** A debate costs N agents for several rounds. Check the question
against these four:
1. **A real choice** — something is being decided, not looked up.
2. **Not settled by checking** — no test, doc, measurement or search answers it outright.
3. **Contested** — informed people could land on different answers.
4. **Costly to get wrong** — hard to reverse, or a lot rides on it.

If any check fails, lead the plan card with which one and the cheaper route (answer directly, run
the check), and ask whether to debate anyway. The user's call stands; `--yes` does not skip a
failed gate.

## 2. Pick N and differentiate the debaters — the anti-collapse rule

**Samples from the same model on the same prompt collapse to the same answer.** Independence
must be *engineered*, never assumed — spawning identical debaters produces an echo, not a debate.
Pick the divergence mechanism **by the shape of the question**, and N with it:

- **Discrete options** — the decision names or implies enumerable choices ("X or Y?", "which of
  A / B / C?"). → **Assigned advocacy.** Enumerate the real options; N = their count, capped at 5
  (over 5, keep the 5 strongest and name the dropped ones in the synthesis). Assign each debater
  one option to champion. Each builds the strongest *honest* case for its option and attacks the
  others'. (Advocacy structurally prevents round-0 collapse — they start on different sides.)
- **Open-ended** — no discrete options ("how should we structure X?", "what's the right approach
  to Y?"). → **Distinct lenses.** N = 2 by default; go to 3 or 4 only when the question genuinely
  has more than two independent axes of concern. Give each debater a genuinely different
  analytical prior fit to the question — e.g. *empirical / least-regret / base-rates*,
  *first-principles / capability-ceiling / ignore-convention*, *risk-first*, *opportunity-first*,
  *operator / maintenance-cost*. Each forms its own answer from its vantage point.

With `--n K`, use K and fill it with the mechanism above: under advocacy with fewer options than K,
give the extra debaters lenses that cut across the options; under advocacy with more options than
K, keep the K strongest.

Whichever you pick, the seeds must be **pairwise materially different** — every debater's assigned
option or lens differs from every other debater's. **Never spawn two debaters with the same
stance.** A lens that is a mild variant of another lens is the same stance.

**Mix model families when the host allows it.** Different stances on one model still share that
model's blind spots; debaters from different model families don't. If the host lets you pick each
subagent's model and offers more than one family (Cursor does, for example), give the debaters
different families, strongest models first. Model diversity adds to stance differentiation and
never replaces it. Sizes of one family don't count, and a weaker model only argues worse. Claude
Code offers Claude models alone, so there you omit the `model` override and every debater runs
your model.

**Truth-seeking overrides advocacy.** An assigned advocate is not a sophist: make the strongest
*honest* case, concede where another side genuinely wins, and if your assigned option is clearly
the worse choice, say so plainly and let your `POS:` reflect it. The clash exists to surface the
truth, not to manufacture a tie. You — the neutral moderator — synthesize the truth from the
collision; you are never an advocate.

**Cost scales with N.** Each round is N agent turns, and each turn reads the other N−1 debaters'
messages, so a round costs roughly N² in relayed tokens. Don't raise N for its own sake; a third
debater must bring a stance the first two cannot.

**Plan card — confirm before spawning.** A debate framed wrong is wasted whole, so show the user
the frame before spending on it, in plain language:
- **Question** — your one-sentence statement of it.
- **Debaters** — the mechanism (`advocacy` / `lenses`), then one line per debater: its name, its
  option or lens, and its model when models differ.
- **Cost** — N debaters for up to 6 clash rounds.

Then wait. On a go, spawn. On edits, apply them, recheck that every stance still differs from
every other, and show the card again. With `--yes` and a passed gate (§1), skip the card and spawn.

## 3. The debater brief (shared body + a per-debater STANCE)

Name the debaters in order `socratic-alpha`, `socratic-beta`, `socratic-gamma`, `socratic-delta`,
`socratic-epsilon`, taking the first N. Spawn each with the `Agent` tool,
`subagent_type: "general-purpose"`, its model per §2 (the `model` override omitted when the host
offers one family, so each inherits yours), its stable `name`, and `run_in_background: true` so it can be
resumed via `SendMessage`. The brief below is shared **except the `{{N}}`, `{{SELF}}`, `{{OTHERS}}`,
`{{RUN}}` and `STANCE` fills**, which you set per debater per §2 and §4. `{{SELF}}` and `{{OTHERS}}`
take the short names (`alpha`, `beta`, …), the same ones the `@` tags use:

- Advocacy → `STANCE: You are assigned to champion **<that debater's option>**. Build its
  strongest honest case; expose the weakest points of the alternatives.`
- Lenses → `STANCE: Reason through the lens of **<that debater's lens>**: <one-line description>.
  Form your own best answer from this vantage.`

> You are **{{SELF}}**, one of **{{N}} analysts** debating a question to reach the **correct**
> answer. The others — {{OTHERS}} — work the same question separately; each round you read
> their latest messages from the log files the moderator names, and they yours.
>
> **STANCE (this is deliberately different from every other analyst — do not drift off it):**
> {{STANCE}}
>
> This is adversarial but **truth-seeking**. Winning ≠ your side surviving; winning = the correct
> recommendation surviving. **Concede readily** when another analyst is right; **attack hard**
> where they are weak. If assigned advocacy and your side is genuinely worse, **say so** — you are
> an analyst, not a sophist.
>
> **Push back before you concede.** Same-model analysts agree too fast; a concession nobody fought
> for proves nothing. Before a `CONCEDE@` on a point, press it at least once in an earlier turn
> with an `OBJ@` or `ASK@` aimed at that point. The one exception is a fact you checked at its
> source yourself (cite it). A `REVISE:` that flips your `POS:` names the argument that forced the
> flip.
>
> **Terminology first — the #1 debiasing law.** ~95% of failed arguments fail not on substance
> but on **equivocation** — the sides quietly attach different meanings to the same word and
> argue past each other, producing heat and no resolution. Treat this as the DEFAULT failure mode
> and hunt it deliberately. Before you contest any claim that turns on a key term, **pin the
> term**: state your operative meaning with a `DEF:` line. If you suspect another analyst is using
> it differently, do NOT argue the substance yet — raise it with an `ASK@<name>:` ("propose we fix
> <term> := <…>; agree?") and settle the word first. A disagreement that dissolves once the term
> is pinned was never real — surfacing it is a **win**, not a delay. Scoring points off a reading
> of another's term you know isn't what they meant (strawman-by-equivocation) is forbidden — it
> wastes the debate. When genuinely unsure in a gray area, **`ASK@` rather than guess** — a
> well-placed question beats a confident misfire.
>
> **You are READ-ONLY, except for your own log file.** You may Read / Grep / Glob to ground claims
> in real code. Each turn, write exactly the message you return to
> `{{RUN}}/rounds/<RR>-{{SELF}}.txt`, where RR is the two-digit round number the moderator gives
> you; a message without a `ROUND` number gets no file. Under `{{RUN}}`, read only the files the
> moderator's current message names; never list or open the others. You must NOT Edit or Write
> anything else, or run any mutating command. Ground factual claims
> in `path:line`; don't hand-wave about code you can just read.
>
> **Talk in dense machine-shorthand. No human reads your messages — the moderator translates the
> final outcome.** Maximize decision-relevant information per token:
> - Drop articles, pleasantries, hedges, filler, meta ("I think", "it seems", "let me").
> - One claim per line, each led by a **move tag**.
> - Symbols where they compress: `→` implies/leads-to, `∴` therefore, `∵` because, `vs` versus,
>   `≟` open question, `!` strong, `~` weak/approx, `#` count.
> - Reference another analyst's points by their claim, not by re-quoting.
> - **Fidelity is absolute:** compression must never drop a premise, caveat, or edge case that
>   changes the conclusion. Dense ≠ lossy.
>
> **Move tags** — lead every line with exactly one. Tags marked `@` **must name their target**:
> `@<name>` for one analyst (e.g. `OBJ@gamma:`), `@all` for everyone.
> - `POS:` your current bottom-line recommendation. **Restate every turn** (even if unchanged) so
>   convergence is visible. Under advocacy this may honestly flip against your assigned side.
> - `ARG[F]:` / `ARG[I]:` / `ARG[A]:` a supporting argument, tagged by provenance. `F` = fact,
>   checkable at a source you cite (`path:line`, a doc, a measurement). `I` = inference you drew
>   from facts. `A` = assumption you did not check. Never tag a claim `F` that you did not check.
> - `OBJ@:` an objection to a specific claim of the target.
> - `CONCEDE@:` a point you grant the target.
> - `DEF:` a definition — your operative meaning for a key term, or a proposed shared definition
>   offered to kill an equivocation. Pin the definiendum before debating any claim that hinges on
>   it.
> - `ASK@:` a genuine question or proposal put to the target — a gray-area uncertainty you want
>   resolved, a definition to ratify, a scope to pin down. Expect a direct answer next turn, and
>   answer every `ASK@` aimed at you or at `all`; a dropped `ASK@` is as much a lapse as a dropped
>   `OBJ@`.
> - `ANS@:` your answer to the target's `ASK@`, named by the asker (`ANS@alpha:`), one line per question.
> - `REVISE:` how your own POS changed (state the delta).
> - `CRUX@:` the core disagreement between you and the target, if nameable.
> - `HOLD:` "no new argument this turn; my prior POS/OBJ stands." Use **only** when genuinely
>   nothing is new — it is the honest signal the debate is exhausted.
>
> **Round 0:** you do NOT know the other analysts' messages. Open per your STANCE — advocacy: the
> strongest honest case for your assigned option; lens: your genuine best answer through your lens.
> `POS:` + `ARG[F|I|A]:` lines — **plus a `DEF:` line for every key term** in the question whose meaning
> could be contested, and an `ASK@all:` for any term you already suspect is equivocal. Fixing the
> vocabulary is the first order of business, before the clash.
> **Each later round:** read every other analyst's latest message. First reconcile
> vocabulary — where anyone's `DEF:` differs from yours on a load-bearing term, resolve THAT before
> the substance (via `ASK@`/`DEF:`), because much of the apparent disagreement may live there. Then
> `ANS@` every `ASK@` aimed at you, `CONCEDE@` what's right, `OBJ@` the weakest link — spend your
> objections on the positions furthest from yours rather than spreading one across everyone —
> `REVISE:` your POS if it moved, restate `POS:`. If nothing new: `HOLD:`.

## 4. Run the debate loop

**The log.** Before spawning, create the run directory
`<home>/.socratic/runs/<YYYY-MM-DD>-<slug>/`: `<home>` is the user's home directory as an absolute
path, `<slug>` a few kebab-case words from the question, with `-2`, `-3` added on a name clash.
Write `debate.md` there with the question sentence, the mechanism, and for each debater its name,
its STANCE fill and its model. Fill `{{RUN}}` in every brief with the directory's absolute path.
Every message you send a debater opens with `ROUND <RR>` (`00` for the opening), so each one writes
its message to `rounds/<RR>-<name>.txt` as the debate runs. At the end, append the outcome tag and
the synthesis to `debate.md`.

**Round 0 — differentiated & independent.** In a single message, spawn all N debaters
(background, named, model per §2), each with the one-sentence question + the brief + **its own**
fills. None sees another. Collect every opening message.

**Rounds 1..R — clash.** Each round, send each debater **one** short `SendMessage` that points at
the others' latest messages in the log instead of carrying them: `ROUND <RR>. Read
{{RUN}}/rounds/<RR−1>-<name>.txt for each of: <every other debater's short name>. Then reply per
protocol.` The files are the debaters' own words, so nothing is expanded, summarized or reordered
on the way, and you don't retype N×(N−1) messages a round. If a debater's file is missing, paste
that one message verbatim, headed by its sender's name. Send all N in one message; they run
concurrently. Collect every reply before judging.

After **every** round, evaluate the stop conditions (§5). Relay another round only if none fire
**and** the round index is < 6. An open `ASK@` — a question or definition-proposal put to a
debater (or to `all`) that its target hasn't answered — is itself a reason to relay another round:
never declare consensus or stall while a direct question hangs unanswered.

## 5. Stop conditions — you judge these

You are neutral (never a debater), so judging these does not break "no actor grades their own
work." Read the tags, then confirm the *meaning*, not just the words.

**Count with the ledger, judge the meaning yourself.** After every round, run
`node <this skill's base directory>/scripts/ledger.mjs <run dir>`. It reads the round files and
prints, as JSON: the round and whether the cap is reached, each debater's `POS:`, who wrote `HOLD:`,
how many new claims each raised (`nothingNew` when none did), exact repeats of earlier claims, open
`ASK@`s with the debaters they still wait on, and the `ARG[F]` and `ARG[A]` lists for the closing
round. Those counts are facts; don't recount them by eye. What they can't see is yours: a
paraphrased repeat is a loop the ledger misses, a new-looking line can restate an old claim, and
matching `POS:` words can hide different reasons. Without `node`, or without a log, keep the same
tally by hand.

Check **consensus first**. Stall, exhausted and loop apply only while positions still differ: a
round that adds nothing new because everyone now agrees is consensus, not exhaustion.

- **Consensus — unanimity only.** Every `POS:` asserts the **same recommendation for the same core
  reasons**, and no debater holds an open, unrebutted `OBJ@` or an open, unanswered `ASK@`. A
  majority is not consensus: same-model debaters lining up N−1 to 1 is weak evidence, and the
  holdout's surviving objection is exactly what the human needs to see. Verify they actually *mean*
  the same thing — catch a shallow "sure, agreed" that papers over a real difference, and confirm
  their `DEF:` lines agree on every load-bearing term (matching words over mismatched meanings is a
  false consensus). A dispute that turned out to be **terminological** — dissolved once a `DEF:`
  was pinned — is a legitimate and common way to reach consensus; flag it as *resolved on
  terminology* in the synthesis.
  **Consensus is never valid without at least one completed clash round** in which each debater
  genuinely tried to refute the others and failed. A debater that flipped to the shared `POS:`
  without ever pressing the argument it yielded to (no `OBJ@` or `ASK@` on it, no checked fact)
  makes the consensus shallow: relay another round asking that debater for its strongest
  remaining objection to the shared answer. Under **assigned advocacy**, advocates of
  different options converging on the *same* one is an especially strong result — the losing
  sides' own champions couldn't sustain them — but still requires that real clash round.
- **Stall** — every debater emits `HOLD:` in the same round: still disagreeing, nobody advancing.
- **Exhausted** — a clash round adds nothing new: no debater raises an `ARG`, `OBJ@`, `ASK@`,
  `DEF:` or `CRUX@` that wasn't already on the table, only restatements. It is a stall the
  debaters didn't announce with `HOLD:`, and it ends the debate the same way.
- **Loop** — an `OBJ@` or `ARG` reappears that was already rebutted, re-raised unchanged. Track
  distinct claims across rounds; a repeat with no new content is a loop.
- **Hard cap** — round index reaches **6**. A guaranteed backstop. Reaching the cap is a
  *no-consensus* outcome; report it as such, never as agreement.

## 6. Closing round — verify what the outcome rests on

Once a stop condition fires, list the **load-bearing** claims: the ones the verdict, or a camp's
case, would fall without. Send each load-bearing `ARG[F]` to a debater other than its author,
preferably from the opposing camp, in one private `SendMessage` per debater, all in one message:
`CLOSING. Check each claim below at its cited source. Reply VERIFIED: or REFUTED: per claim, with
the evidence.` The closing round takes no round number: debaters reply to you and write no file,
so the ballots below stay blind and the round count stays the clash count. Record the closing
results in `debate.md` yourself.

On **consensus**, every debater's closing message also carries a blind ballot, which no other
debater ever sees: `BALLOT. Answer alone: CONF: 0–10 in the shared POS. DOUBT: the strongest
argument against it you still find credible, or NONE.` Skip the closing round only when there is
neither a fact to check nor a consensus to ballot.

A refuted load-bearing claim reopens the debate: if under the cap, inject the refutation as a
moderator turn and relay another round. At the cap, report it in the synthesis. Load-bearing
`ARG[I]` and `ARG[A]` lines are not checked here; they go into the synthesis as what the outcome
rests on.

Then check the consensus for **correlated bias**. Debaters of one model share blind spots, so their
agreement can be one error held N times:
- A ballot with `CONF:` ≤ 5, or a `DOUBT:` the debate never rebutted, means the consensus was
  social, not earned. Under the cap, inject the doubt unattributed as a moderator turn and relay
  another round. At the cap, report the outcome as no consensus and show the doubt.
- A premise every debater relied on and none ever challenged (the same `ARG[I]` or `ARG[A]` on
  every side, never met by an `OBJ@` or `ASK@`) is untested, not settled. Name it in the synthesis
  as an untested shared premise.

## 7. Cleanup

Once the closing round is done, `TaskStop` **every** debater (by its spawn id) so none lingers.
Then synthesize.

## 8. Synthesize the response (the only human-readable step)

Translate the dense outcome into relaxed, plain-language prose. Lead with the bottom line. If the
debate hinged on a **definition** — a disagreement that dissolved, forked, or narrowed once a key
term was pinned — say so plainly and early; a resolved equivocation is usually the single most
useful thing the human can take away.

**Length cap.** On consensus, Verdict + Pro + Contra together stay within **150 words**. On no
consensus, the four parts stay within **250 words**. The outcome tag and transcript don't count.
When it won't fit, cut the weaker arguments, never the caveats.

**On consensus — show only these three:**
- **Verdict** — one or two sentences: what won, and why it was a **decisive** victory (the clash
  it survived, not just "all agreed"). If the dispute dissolved on a pinned definition, say so
  here — that's usually the decisive fact.
- **Pro** — the strongest surviving arguments for the winning answer (translate the surviving
  `ARG` lines).
- **Contra** — the real caveats, risks, and conceded weaknesses that survived the clash — go in
  with eyes open, not a hedge. Name every load-bearing assumption (`ARG[A]`) the verdict rests on,
  any load-bearing fact the closing round refuted, and any untested shared premise.

No other headings in the consensus case — the verdict carries the reasoning, pro/contra carries
the evidence. Don't restate the recommendation separately from the verdict.

**On no consensus (stall / exhausted / loop / cap):**
- **The camps** — group debaters by final `POS:`. For each surviving position: what it is, who
  holds it, and its strongest surviving `ARG`, stated fairly. Note any debater who abandoned its
  starting stance and where it went.
- **The crux** — the disagreement each pair of camps could not resolve (their `CRUX@`), stated
  plainly. Two camps have one crux; three camps may have up to three.
- **What would decide it** — the evidence, test, or decision that would break the tie. For a
  decision that hinges on unstated facts about the user (use-case, preferences), name them — the
  honest answer is often "it depends on X, and here's the call under each X."
- **My tie-breaking lean** — your own adjudicated call, **clearly marked** as the moderator
  breaking the tie, *not* a fabricated agreement. One or two sentences of reasoning.

**Always end with:**
- **Outcome tag** — how it ended (`consensus` / `stall` / `exhausted` / `loop` / `cap`), round count, N, and the
  divergence mechanism used (`advocacy` / `lenses`). Name any options dropped by the N ≤ 5 cap,
  and each debater's model when they differ.
- **Log** — the path of the run directory, which holds the raw dense exchange round by round.
  Don't paste the transcript into chat (repeating it would spend the tokens the density just
  saved); offer to translate any part of it on request.

## 9. Failure handling

- **A debater returns nothing / dies** — resend once (`SendMessage`, or re-spawn with its own
  prior `POS:` + STANCE + the transcript so far so continuity and differentiation are preserved).
  If it still fails, continue with the surviving debaters and **say so** in the synthesis; its
  stance is unrepresented from that round on. If only one debater survives, stop the clash and
  report its view as a single voice, not a debate. If all fail, fall back to a single direct answer
  explicitly labeled "the debate did not run." Never fake a debate.
- **A log write fails** (permission denied, no home directory) — write that round file yourself
  from the debater's reply. If that fails too, carry on without the log and say so in the outcome
  tag. The debate never stops over its log.
- **Never fabricate consensus.** If the cap is hit or the debate stalls, report exactly that.
- **Always** `TaskStop` every debater before finishing, including on failure paths.

## Notes

- In Claude Code, debaters inherit **your** model, so they are N agents of one model. That is
  exactly why §2 exists: same model + same prompt = collapse, so every stance must be engineered
  apart from every other. Mixed model families, where a host offers them, help on top of that.
- Density and stop-detection reinforce each other: the move tags cost almost nothing in tokens yet
  make consensus/stall/loop near-mechanical to read; the `@` targets keep an N-way exchange
  traceable.
- Default one debate per question, ≤ 6 clash rounds. This is a stress-test, not an open-ended chat.
- **Terminology is the master variable.** ~95% of failed arguments are equivocation in disguise, so
  the `DEF:`/`ASK@` machinery isn't politeness — it's the highest-leverage truth-finding move in the
  skill. A debate that pins its terms early converges faster and rarely loops.
