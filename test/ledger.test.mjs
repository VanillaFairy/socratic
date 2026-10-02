import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ledger, readRun } from '../skills/socratic/scripts/ledger.mjs';

const msg = (round, name, ...lines) => ({ round, name, text: lines.join('\n') });

test('an ASK stays open until its target answers the asker in a later round', () => {
  const ask = msg(0, 'alpha', 'POS: x', 'ASK@beta: durable := survives crash?');
  const sameRound = msg(0, 'beta', 'POS: y', 'ANS@alpha: yes');
  const wrongAsker = msg(1, 'beta', 'POS: y', 'ANS@gamma: yes');
  assert.equal(ledger([ask, sameRound]).openAsks.length, 1);
  assert.equal(ledger([ask, sameRound, msg(1, 'alpha', 'POS: x'), wrongAsker]).openAsks.length, 1);
  const answered = msg(1, 'beta', 'POS: y', 'ANS@alpha: yes');
  assert.deepEqual(ledger([ask, sameRound, msg(1, 'alpha', 'POS: x'), answered]).openAsks, []);
});

test('an ASK@all waits on every other live debater', () => {
  const r = ledger([
    msg(0, 'alpha', 'POS: x', 'ASK@all: scope?'),
    msg(0, 'beta', 'POS: y'),
    msg(0, 'gamma', 'POS: z'),
    msg(1, 'alpha', 'POS: x'),
    msg(1, 'beta', 'POS: y', 'ANS@alpha: narrow'),
    msg(1, 'gamma', 'POS: z'),
  ]);
  assert.deepEqual(r.openAsks.map((a) => a.waitingOn), [['gamma']]);
});

test('a round of restated claims has nothing new; one new claim does; round 0 always does', () => {
  const opening = [msg(0, 'alpha', 'POS: x', 'ARG[F]: pg skip locked ok'), msg(0, 'beta', 'POS: y', 'OBJ@alpha: aof loses 1s')];
  assert.equal(ledger(opening).nothingNew, false);
  const restated = [msg(1, 'alpha', 'POS: x', 'ARG[I]: PG  skip locked OK'), msg(1, 'beta', 'POS: y', 'OBJ@alpha: aof loses 1s')];
  assert.equal(ledger([...opening, ...restated]).nothingNew, true);
  const fresh = [restated[0], msg(1, 'beta', 'POS: y', 'OBJ@alpha: ops wants one db')];
  const r = ledger([...opening, ...fresh]);
  assert.equal(r.nothingNew, false);
  assert.deepEqual(r.newClaims, { alpha: 0, beta: 1 });
});

test('a claim re-raised from an earlier round is a repeat pointing at its first occurrence', () => {
  const r = ledger([
    msg(0, 'alpha', 'POS: x', 'OBJ@beta: aof loses 1s'),
    msg(0, 'beta', 'POS: y'),
    msg(1, 'alpha', 'POS: x'),
    msg(1, 'beta', 'POS: y', 'OBJ@alpha: aof loses 1s'),
  ]);
  assert.deepEqual(r.repeats.map((x) => [x.debater, x.first]), [['beta', { round: 0, debater: 'alpha' }]]);
});

test('stall and cap read off the latest round', () => {
  const rounds = [msg(0, 'alpha', 'POS: x'), msg(0, 'beta', 'POS: y'), msg(2, 'alpha', 'POS: x', 'HOLD: -'), msg(2, 'beta', 'POS: y', 'HOLD: -')];
  const r = ledger(rounds, 2);
  assert.equal(r.allHold, true);
  assert.equal(r.capReached, true);
  assert.equal(ledger([...rounds.slice(0, 3), msg(2, 'beta', 'POS: y', 'OBJ@alpha: new')]).allHold, false);
});

test('facts and assumptions are listed once each, by provenance', () => {
  const r = ledger([
    msg(0, 'alpha', 'POS: x', 'ARG[F]: aof fsync 1s src:redis.conf:1', 'ARG[A]: volume < 1k/s'),
    msg(1, 'alpha', 'POS: x', 'ARG[F]: AOF fsync 1s src:redis.conf:1'),
  ]);
  assert.equal(r.facts.length, 1);
  assert.equal(r.assumptions.length, 1);
});

test('the run reader picks up only round files', () => {
  const run = mkdtempSync(join(tmpdir(), 'socratic-'));
  mkdirSync(join(run, 'rounds'));
  writeFileSync(join(run, 'rounds', '00-alpha.txt'), 'ROUND 00\r\nPOS: x\r\n');
  writeFileSync(join(run, 'rounds', 'notes.md'), 'POS: ignored');
  const r = ledger(readRun(run));
  assert.deepEqual(r.positions, { alpha: 'x' });
  assert.deepEqual(r.untagged, { alpha: 0 });
});
