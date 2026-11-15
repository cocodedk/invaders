import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossDef } from '../../src/core/bosses-data.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { HUD_BOTTOM, TICK } from '../../src/core/kinds.js';
import { IDLE } from '../../src/core/input-codec.js';

// The Dowager Duck (world 19, R71) never charges, keeps every weak part clear of the HUD at the top of her
// orbit, and is written from her own joke: the ducklings, the ammunition of the world's bat, come out from
// under both armbands, which fire nothing, and no attack line is one of the ray's or the angler's. (The
// generic rules for every boss are in boss-data.test.js.)
const duck = bossDef('duck');
const part = (id) => duck.parts.find((p) => p.id === id);
const attacks = (def) => def.phases.flatMap((p) => p.attacks);
const box = (p) => ({ l: p.dx - p.w / 2, r: p.dx + p.w / 2, t: p.dy - p.h / 2, b: p.dy + p.h / 2 });
const overlap = (p, q) => {
  const [a, b] = [box(p), box(q)];
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
};

test('the Dowager Duck rests at 330, 780 x 380: a column of four on the axis, armbands at her sides, feet below', () => {
  assert.equal(duck.name, 'The Dowager Duck');
  assert.equal(duck.y, 330);
  assert.deepEqual([duck.size.w, duck.size.h], [780, 380]);
  assert.deepEqual(duck.parts.map((p) => p.id), ['bobble', 'bill', 'bandL', 'bandR', 'belly', 'footL', 'footR', 'squeak']);
  for (const id of ['bobble', 'bill', 'belly', 'squeak']) assert.equal(part(id).dx, 0, `${id} on the axis`);
  const column = ['bobble', 'bill', 'belly', 'squeak'].map((id) => part(id).dy);
  assert.deepEqual(column, [...column].sort((a, b) => a - b), 'bobble, bill, belly, squeak from the top');
  assert.equal(part('bobble').dy - part('bobble').h / 2, Math.min(...duck.parts.map((p) => box(p).t)), 'the bobble tops her');
});

test('no two parts overlap, and the armbands and the feet are mirror images', () => {
  for (const p of duck.parts) {
    for (const q of duck.parts) assert.ok(p === q || !overlap(p, q), `${p.id} and ${q.id} overlap`);
  }
  for (const [l, r] of [['bandL', 'bandR'], ['footL', 'footR']]) {
    const [a, b] = [part(l), part(r)];
    assert.deepEqual([a.dx, a.dy, a.w, a.h, a.hp, a.weak, a.armor], [-b.dx, b.dy, b.w, b.h, b.hp, b.weak, b.armor], `${l} mirrors ${r}`);
  }
});

test('weak bill, belly, feet and squeak; armoured bobble and armbands', () => {
  for (const id of ['bill', 'belly', 'footL', 'footR', 'squeak']) assert.ok(part(id).weak, id);
  for (const id of ['bobble', 'bandL', 'bandR']) assert.ok(part(id).armor, id);
});

test('flown through her orbit, every weak part stays clear of the HUD; only the bobble may slip under its edge', () => {
  const w = createWorld(levelById('w19-5'));
  w.ship.invuln = Infinity;
  while (w.state === 'intro' || w.boss.enter > 0) stepWorld(w, TICK, IDLE);
  const last = duck.phases.length - 1;
  for (const p of w.boss.parts) p.hp = p.max * (duck.phases[last - 1].until - 0.02);
  const top = {};
  for (let i = 0; i < 60 * 30; i++) {
    stepWorld(w, TICK, IDLE);
    w.events.length = 0;
    for (const p of w.boss.parts) top[p.id] = Math.min(top[p.id] ?? Infinity, p.y - p.h / 2);
  }
  assert.equal(w.boss.phase, last, 'she is circling');
  for (const p of duck.parts) {
    if (p.weak) assert.ok(top[p.id] >= HUD_BOTTOM, `${p.id} up to y ${top[p.id]}`);
    else if (p.id !== 'bobble') assert.ok(top[p.id] >= HUD_BOTTOM, `${p.id} up to y ${top[p.id]}`);
  }
  assert.ok(top.bobble < HUD_BOTTOM && top.bobble > HUD_BOTTOM - part('bobble').h / 2, `the bobble slips under the edge, to y ${top.bobble}`);
});

test('sways, hovers and circles, never charges; no fan, no laser and no homing; the armbands fire nothing', () => {
  assert.deepEqual(duck.phases.map((p) => p.move), ['sway', 'hover', 'orbit']);
  for (const a of attacks(duck)) {
    assert.ok(!['fan', 'laser', 'homing'].includes(a.pattern), `${a.pattern} from ${a.from}`);
    assert.ok(!a.from.startsWith('band'), `the ${a.from} fires ${a.pattern}`);
  }
  for (const id of ['bobble', 'footL', 'footR']) assert.ok(attacks(duck).some((a) => a.from === id), `${id} fires: a part play reaches late`);
  assert.ok(duck.phases.every((p) => p.attacks.some((a) => a.from === 'bobble' || a.from.startsWith('foot'))), 'every phase fires from one');
});

test('the ducklings come out from under both armbands in every phase, three at a time, and the carrier is listed first', () => {
  for (const p of duck.phases) {
    assert.equal(p.minions[0].role, 'carrier', `${p.move}: the carrier first`);
    for (const band of ['bandL', 'bandR']) {
      const lines = p.minions.filter((m) => m.from === band);
      assert.ok(lines.length && lines.every((m) => m.role === 'diver' && m.count === 3), `${p.move}: ducklings from ${band}`);
    }
    const [l, r] = ['bandL', 'bandR'].map((band) => p.minions.find((m) => m.from === band).every);
    assert.notEqual(l, r, `${p.move}: the two lines keep different time`);
    assert.ok(p.minions.every((m) => m.count <= 3), 'a burst is at most 3');
  }
});

test('no attack line (pattern, interval and numbers) is one of the ray\'s or the angler\'s', () => {
  const line = (a) => JSON.stringify([a.pattern, a.every, a.p]);
  const theirs = new Set(['ray', 'angler'].flatMap((k) => attacks(bossDef(k)).map(line)));
  for (const a of attacks(duck)) assert.ok(!theirs.has(line(a)), `${line(a)} from the ${a.from}`);
});
