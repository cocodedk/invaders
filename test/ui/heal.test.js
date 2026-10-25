import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { levelById } from '../../src/core/levels.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { TICK } from '../../src/core/kinds.js';
import { autopilot } from '../../src/core/autopilot.js';

// The healing of world 17 (src/ui/heal.js): the h each level and wave has earned, its easing and the
// stages every painter reads. How the view crossfades the baked twins is heal-view.test.js.
installCanvas(64);
const { healTarget, createHeal, stepHeal, stage, HEAL_STAGES, HEAL_WORLD, RATE } = await import('../../src/ui/heal.js');

const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-9, `${why}: ${a} vs ${b}`);
const play = (id, wave, aliens = 1) => {
  const w = createWorld(levelById(id));
  w.state = 'play';
  w.wave = wave;
  w.aliens = Array.from({ length: aliens }, (_, i) => ({ id: i }));
  return w;
};

test('the wave levels heal 0.2 each, from (index - 1) x 0.2 by the waves cleared', () => {
  for (let index = 1; index <= 4; index++) {
    const id = `w17-${index}`;
    const n = levelById(id).waves.length;
    const base = (index - 1) * 0.2;
    near(healTarget(play(id, 1)), base, `${id} at its start`);
    near(healTarget(play(id, 2)), base + 0.2 / n, `${id} one wave cleared`);
    near(healTarget(play(id, n)), base + (0.2 * (n - 1)) / n, `${id} on its last wave`);
    near(healTarget(play(id, n, 0)), base + 0.2, `${id}: the last wave cleared`);
    const done = play(id, n);
    done.state = 'cleared';
    near(healTarget(done), base + 0.2, `${id} cleared`);
  }
});

test('a wave cleared counts as soon as the field is empty, and never more than the level has', () => {
  const w = play('w17-3', 2, 0);
  near(healTarget(w), 0.4 + (0.2 * 2) / levelById('w17-3').waves.length, 'two waves cleared with the field empty');
  w.wave = 99;
  near(healTarget(w), 0.6, 'capped at the level');
  w.state = 'intro';
  w.wave = 1;
  w.aliens = [];
  near(healTarget(w), 0.4, 'the intro is not a cleared wave');
});

test('the boss level runs 0.8 to 1 as the Craving loses its health, 1 once it is dying, gone or the level cleared', () => {
  const w = createWorld(levelById('w17-5'));
  w.state = 'play';
  near(healTarget(w), 0.8, 'full health');
  w.boss.hp = w.boss.maxHp / 2;
  near(healTarget(w), 0.9, 'half health');
  w.boss.hp = 0;
  near(healTarget(w), 1, 'no health');
  w.boss.hp = w.boss.maxHp;
  w.boss.dying = 1;
  near(healTarget(w), 1, 'dying');
  w.boss = null;
  near(healTarget(w), 1, 'gone');
  const done = createWorld(levelById('w17-5'));
  done.state = 'cleared';
  near(healTarget(done), 1, 'cleared');
});

test('the target follows the real sim: it never falls, and it ends at the level\'s end', () => {
  const w = createWorld(levelById('w17-1'));
  let last = 0;
  for (let i = 0; i < 60 * 60 && w.state !== 'cleared' && w.state !== 'failed'; i++) {
    stepWorld(w, TICK, autopilot(w));
    const h = healTarget(w);
    assert.ok(h >= last - 1e-9 && h <= 0.2 + 1e-9, `tick ${i}: ${h}`);
    last = h;
  }
  assert.ok(last > 0, 'some healing was earned');
});

test('h is eased: the first frame snaps, then it closes on the target without a jump, and never overshoots', () => {
  const w = play('w17-2', 1);
  const heal = createHeal();
  near(stepHeal(heal, w, 0.016), 0.2, 'the first frame snaps to the target (a frozen frame shows the right h)');
  w.wave = 3; // two waves cleared: the target steps up
  const target = healTarget(w);
  let prev = heal.h;
  let biggest = 0;
  for (let i = 0; i < 600; i++) {
    const h = stepHeal(heal, w, 1 / 60);
    biggest = Math.max(biggest, h - prev);
    assert.ok(h >= prev - 1e-12 && h <= target + 1e-12, `frame ${i}`);
    prev = h;
  }
  assert.ok(biggest < (target - 0.2) * RATE / 60 * 1.01, `no frame moves more than the rate allows (${biggest})`);
  near(heal.h, target, 'settled');
  const slow = createHeal();
  stepHeal(slow, play('w17-2', 1), 0);
  assert.equal(stepHeal(slow, w, 0), 0.2, 'a frame of no time moves nothing');
});

test('a pinned h (the dev sheet) holds, whatever the world says', () => {
  const heal = createHeal();
  heal.force = 0.55;
  assert.equal(stepHeal(heal, play('w17-1', 1), 0.016), 0.55);
  assert.equal(stepHeal(heal, play('w17-5', 1), 0.016), 0.55);
});

test("every stage runs from 0 to 1 over its range (a smoothstep, or the smog's power ramp), never falling, and each is named by the look and the brief", () => {
  for (const name of Object.keys(HEAL_STAGES)) {
    const [a, b, power] = HEAL_STAGES[name];
    assert.ok(a >= 0 && b <= 1 && a < b, name);
    assert.equal(stage(a - 0.01 > 0 ? a - 0.01 : 0, name), 0);
    assert.equal(stage(b, name), 1);
    near(stage((a + b) / 2, name), power ? 0.5 ** power : 0.5, `${name} halfway`);
    let last = 0;
    for (let h = 0; h <= 1.0001; h += 0.01) {
      const s = stage(h, name);
      assert.ok(s >= last - 1e-12 && s >= 0 && s <= 1, `${name} at ${h}`);
      last = s;
    }
  }
  assert.equal(HEAL_WORLD, 17);
  assert.deepEqual(Object.keys(HEAL_STAGES).toSorted(), ['ash', 'beams', 'green', 'life', 'smog', 'sun', 'wisps']);
});

