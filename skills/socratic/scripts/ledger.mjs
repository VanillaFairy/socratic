// Mechanical bookkeeping for a socratic run: reads rounds/<RR>-<name>.txt and reports the facts the
// stop conditions are judged on. It never judges meaning; the moderator does.
//
// Usage: node ledger.mjs <run-dir> [--cap <round>]

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Tolerates a leading list marker or quote and bold around the tag: `- POS:`, `**ARG[F]:**`.
const TAG = /^[\s>*-]*(POS|ARG|OBJ|CONCEDE|DEF|ASK|ANS|REVISE|CRUX|HOLD)(?:\[([FIA])\])?(?:@([A-Za-z-]+))?(?:\*\*)?\s*:(?:\*\*)?\s*(.*)$/;
const CLAIM_KINDS = new Set(['ARG', 'OBJ', 'ASK', 'DEF', 'CRUX']);
const FILE = /^(\d{2})-([a-z]+)\.txt$/;

const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export function parseMessage(text) {
  const lines = [];
  let untagged = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || /^\s*ROUND\b/.test(raw)) continue;
    const m = TAG.exec(raw);
    if (!m) { untagged++; continue; }
    lines.push({ kind: m[1], provenance: m[2] ?? null, target: m[3]?.toLowerCase() ?? null, text: m[4].trim() });
  }
  return { lines, untagged };
}

// messages: [{ round, name, text }]
export function ledger(messages, cap = 6) {
  if (messages.length === 0) throw new Error('no round files');
  const parsed = messages
    .map((m) => ({ ...m, ...parseMessage(m.text) }))
    .sort((a, b) => a.round - b.round || a.name.localeCompare(b.name));
  const round = Math.max(...parsed.map((m) => m.round));
  const latest = parsed.filter((m) => m.round === round);
  const debaters = latest.map((m) => m.name);

  const seen = new Map();
  const newClaims = Object.fromEntries(debaters.map((d) => [d, 0]));
  const repeats = [];
  for (const m of parsed) {
    for (const line of m.lines) {
      if (!CLAIM_KINDS.has(line.kind)) continue;
      const key = `${line.kind}|${normalize(line.text)}`;
      const first = seen.get(key);
      if (!first) seen.set(key, { round: m.round, debater: m.name });
      if (m.round !== round) continue;
      if (!first) newClaims[m.name]++;
      else if (first.round < round) repeats.push({ debater: m.name, kind: line.kind, text: line.text, first });
    }
  }
  const totalNew = Object.values(newClaims).reduce((a, b) => a + b, 0);

  // Each ANS@<asker> line answers one ASK: the earliest open one its author owes that asker.
  const answers = new Map();
  for (const m of parsed) for (const l of m.lines) {
    if (l.kind !== 'ANS') continue;
    const key = `${m.name}>${l.target}`;
    answers.set(key, [...(answers.get(key) ?? []), m.round]);
  }
  const openAsks = [];
  for (const m of parsed) {
    for (const line of m.lines.filter((l) => l.kind === 'ASK')) {
      const targets = line.target === 'all' || line.target === null
        ? debaters.filter((d) => d !== m.name)
        : debaters.filter((d) => d === line.target);
      const waitingOn = targets.filter((t) => {
        const rounds = answers.get(`${t}>${m.name}`) ?? [];
        const i = rounds.findIndex((r) => r > m.round);
        if (i === -1) return true;
        rounds.splice(i, 1);
        return false;
      });
      if (waitingOn.length) openAsks.push({ from: m.name, to: line.target, round: m.round, text: line.text, waitingOn });
    }
  }

  const byProvenance = (p) => {
    const out = new Map();
    for (const m of parsed) for (const l of m.lines) {
      if (l.kind === 'ARG' && l.provenance === p && !out.has(normalize(l.text))) {
        out.set(normalize(l.text), { debater: m.name, round: m.round, text: l.text });
      }
    }
    return [...out.values()];
  };

  const holds = latest.filter((m) => m.lines.some((l) => l.kind === 'HOLD')).map((m) => m.name);
  return {
    round,
    cap,
    capReached: round >= cap,
    debaters,
    positions: Object.fromEntries(latest.map((m) => [m.name, m.lines.find((l) => l.kind === 'POS')?.text ?? null])),
    holds,
    allHold: holds.length === debaters.length,
    newClaims,
    nothingNew: round > 0 && totalNew === 0,
    repeats,
    openAsks,
    facts: byProvenance('F'),
    assumptions: byProvenance('A'),
    untagged: Object.fromEntries(latest.map((m) => [m.name, m.untagged])),
  };
}

export function readRun(runDir) {
  const dir = join(runDir, 'rounds');
  return readdirSync(dir)
    .map((f) => [f, FILE.exec(f)])
    .filter(([, m]) => m)
    .map(([f, m]) => ({ round: Number(m[1]), name: m[2], text: readFileSync(join(dir, f), 'utf8') }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const capAt = args.indexOf('--cap');
  const cap = capAt === -1 ? 6 : Number(args[capAt + 1]);
  const runDir = args.find((a, i) => !a.startsWith('--') && (capAt === -1 || i !== capAt + 1));
  if (!runDir || Number.isNaN(cap)) {
    console.error('usage: node ledger.mjs <run-dir> [--cap <round>]');
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(ledger(readRun(runDir), cap), null, 2));
  } catch (err) {
    console.error(`ledger: ${err.code === 'ENOENT' ? `no rounds/ directory in ${runDir}` : err.message}`);
    process.exit(1);
  }
}
