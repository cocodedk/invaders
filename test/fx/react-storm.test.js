import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REACTS, applyEvent } from '../../src/fx/react.js';
import { ARMADA } from '../../src/fx/react-armada.js';
import { STORM_WORLD } from '../../src/fx/react-storm.js';
import { STORM_WORLD as DRAWN_WORLD } from '../../src/ui/storm-bolt.js';
import { createFx, stepFx } from '../../src/fx/fx.js';
import { createFilm } from '../../src/fx/film.js';
import { MAX_PARTICLES } from '../../src/fx/particles.js';
import { makeRng } from '../../src/core/rng.js';
import { sampleEvent } from '../event-sample.js';
import { react, run, kindsOf } from './fx-kit.js';

// World 18's electrical effects (react-storm.js): the borrowed broadside's side shots and the guns opening and closing told as arcs, and
// the new `backfire` as an electric burst on the alien. The arcs are drawn by test/ui/storm-look.test.js. Worlds 1 to 17 see what they always saw.
const storm = { level: { world: 18, twist: 'broadside' }, ship: { x: 800, y: 900 }, aliens: [] };
const armada = { level: { world: 13, twist: 'broadside' }, ship: { x: 800, y: 900 }, aliens: [] };
const shot = (dir) => ({ type: 'sideShot', x: 800 + dir * 22, y: 900, dir });
const open = { type: 'broadside', on: true, left: 6, x: 800, y: 900 };
const shut = { type: 'broadside', on: false, left: 0, x: 800, y: 900 };
const hit = { type: 'backfire', id: 4, role: 'grunt', x: 640, y: 300 };
const arcs = (fx) => fx.rings.filter((r) => r.kind === 'arc');

test("every event of the borrowed twist and the new one has a reaction; the world's own state needs nothing more", () => {
  for (const type of ['sideShot', 'broadside', 'backfire']) assert.ok(REACTS.includes(type), type);
  assert.equal(STORM_WORLD, 18);
  assert.equal(DRAWN_WORLD, STORM_WORLD, 'the drawing and the fx mean the same world');
});

test('a side shot in world 18 is a blue-white flash, a thin ring, arcs fanned the way the shot flies, and a few sparks', () => {
  for (const dir of [-1, 1]) {
    const fx = react(shot(dir), storm);
    assert.equal(fx.flashes.length, 1);
    assert.deepEqual([fx.flashes[0].tag, fx.flashes[0].color, fx.flashes[0].life < 0.1], ['muzzle', '#bfeaff', true]);
    assert.ok(Math.sign(fx.flashes[0].x - (800 + dir * 22)) === dir, 'out of the barrel, toward its side');
    const [a] = arcs(fx);
    assert.ok(a && a.n >= 2 && a.maxR >= 30 && a.maxR <= 60, 'a short fan of arcs');
    assert.equal(Math.cos(a.ang), dir, 'pointing the way the shot flies');
    assert.ok(fx.rings.length === 2 && fx.rings.some((r) => r.kind === 'ring'));
    assert.ok(fx.particles.length >= 2 && fx.particles.every((p) => p.additive && p.kind === 'spark'), 'sparks only: no smoke');
    assert.ok(![...kindsOf(fx)].includes('smoke'), 'no powder smoke');
  }
});

test('in world 13 and with no world the side shot is the cannon it was: the armada reaction, exactly', () => {
  for (const world of [armada, undefined, { level: { world: 17 } }, { level: {} }]) {
    for (const ev of [shot(-1), shot(1)]) {
      const was = createFx();
      ARMADA.sideShot(was, ev, makeRng(1), world);
      assert.deepEqual(react(ev, world), was, JSON.stringify(world?.level));
    }
    const was = createFx();
    ARMADA.broadside(was, open, makeRng(1), world);
    assert.deepEqual(react(open, world), was);
  }
  assert.ok(kindsOf(react(shot(1), armada)).has('smoke'), "world 13's volley still smokes");
  assert.equal(arcs(react(shot(1), armada)).length, 0);
});

test('the guns opening: a flash, a ring and arcs at each flank, a rush of sparks, and ARC GUNS over the ship; shutting: a few fading sparks only', () => {
  const fx = react(open, storm);
  assert.equal(fx.flashes.length, 2);
  assert.ok(fx.flashes.every((f) => f.tag === 'muzzle' && Math.abs(f.x - 800) > 22), 'at both flanks');
  assert.ok(fx.flashes[0].x < 800 && fx.flashes[1].x > 800);
  assert.equal(arcs(fx).length, 2);
  assert.ok(arcs(fx).every((a) => a.n >= 3 && a.maxR >= 60));
  assert.deepEqual(fx.popups.map((p) => p.text), ['ARC GUNS']);
  assert.ok(fx.particles.length >= 8);
  const off = react(shut, storm);
  assert.deepEqual([off.flashes.length, off.rings.length, off.popups.length], [0, 0, 0]);
  assert.ok(off.particles.length >= 2 && off.particles.length < fx.particles.length / 2, 'a few embers of it');
});

test('a backfire is an electric burst on the alien: a white flash, two rings, five arcs thrown every way, cyan and yellow sparks, and BACKFIRE under it', () => {
  const fx = react(hit);
  assert.equal(fx.flashes.length, 1);
  assert.deepEqual([fx.flashes[0].x, fx.flashes[0].y, fx.flashes[0].tag], [640, 300, 'blast']);
  assert.equal(fx.rings.filter((r) => r.kind === 'ring').length, 2);
  const [a] = arcs(fx);
  assert.deepEqual([a.x, a.y, a.n, a.spread], [640, 300, 5, Math.PI], 'five bolts, all the way round');
  assert.ok(a.maxR >= 60 && a.life <= 0.4);
  assert.deepEqual(fx.popups.map((p) => [p.text, p.color]), [['BACKFIRE', '#5cf0ff']]);
  assert.ok(fx.popups[0].y > 300, 'under the alien: the kill\'s score pops up over it');
  const colors = new Set(fx.particles.map((p) => p.color));
  assert.ok(colors.has('#5cf0ff') || colors.has('#fff2a8') || colors.has('#bfeaff'), `electric colours: ${[...colors]}`);
  assert.ok(fx.particles.length >= 6 && fx.particles.length <= 12 && fx.particles.every((p) => p.additive), 'satisfying, not noisy');
  assert.deepEqual(react(hit, storm), fx, 'the same in the world it is meant for (it reads no world)');
});

test('the effects are seeded and thin out with the quality scaler; another seed throws other arcs', () => {
  assert.deepEqual(react(hit, storm, 3), react(hit, storm, 3));
  assert.notEqual(arcs(react(hit, storm, 3))[0].seed, arcs(react(hit, storm, 4))[0].seed);
  const half = createFx();
  half.density = 0.5;
  applyEvent(half, hit, makeRng(1), storm);
  assert.ok(half.particles.length < react(hit).particles.length);
});

test('a flurry of backfires and side shots never touches the particle cap, and every ring lives its life and goes', () => {
  const fx = createFx();
  const rng = makeRng(9);
  for (let i = 0; i < 80; i++) {
    for (const ev of [hit, shot(1), shot(-1), open]) applyEvent(fx, ev, rng, storm);
  }
  assert.ok(fx.particles.length <= MAX_PARTICLES);
  assert.ok(fx.rings.length <= 64 && fx.flashes.length <= 64 && fx.popups.length <= 64, 'the lists keep their own caps');
  run(fx, 1.5);
  assert.deepEqual([fx.rings.length, fx.flashes.length, fx.popups.length], [0, 0, 0]);
  const one = createFx();
  applyEvent(one, hit, makeRng(1), storm);
  stepFx(one, 0.1);
  const [a] = arcs(one);
  assert.ok(a.r > 0 && a.r < a.maxR, 'an arc eases out to its full reach');
});

test('the reaction reads the world and the sample event, changes nothing it is handed and draws on no dice and no clock', () => {
  const frozen = Object.freeze({ ...storm, level: Object.freeze({ ...storm.level }) });
  const ev = Object.freeze(sampleEvent('backfire'));
  applyEvent(createFx(), ev, makeRng(1), frozen);
  for (const type of ['sideShot', 'broadside']) applyEvent(createFx(), Object.freeze(sampleEvent(type)), makeRng(1), frozen);
  assert.doesNotMatch(readFileSync(new URL('../../src/fx/react-storm.js', import.meta.url), 'utf8'), /window|document|Math\.random|Date\.now|canvas/i);
});

test("world 18's film grade is its own colour: no other world has it", () => {
  const tint = (world) => createFilm({ level: { world, seed: 1 } }).tint;
  const others = Array.from({ length: 17 }, (_, i) => tint(i + 1));
  assert.match(tint(18), /^#[0-9a-f]{6}$/);
  assert.ok(!others.includes(tint(18)));
  assert.equal(new Set([...others, tint(18)]).size, 18);
});
