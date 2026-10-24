import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../../src/core/rng.js';
import { POWERS } from '../../src/core/kinds.js';
import { makePickup } from '../../src/core/powerups.js';
import { createFx } from '../../src/fx/fx.js';
import { powerColor } from '../../src/fx/emit.js';
import { applyEvent } from '../../src/fx/react.js';
import { level, wave, playing, step, drain } from '../core/world-kit.js';
import { react } from './fx-kit.js';

// R53: the homing and slow powers and the extra life reach the fx.
const KINDS = [...POWERS, 'bomb', 'life'];

test('every pickup kind has its own colour in the fx, not the white a stranger gets', () => {
  const colors = KINDS.map(powerColor);
  for (const [i, c] of colors.entries()) assert.match(c, /^#[0-9a-f]{6}$/, KINDS[i]);
  assert.equal(new Set(colors).size, KINDS.length, colors.join());
  assert.equal(powerColor('nothing'), '#ffffff');
});

test('pickup pop-ups: a power says its name, a bomb and an extra life say what they give', () => {
  const text = (kind) => react({ type: 'pickup', kind, x: 500, y: 700, points: 500 }).popups[0].text;
  assert.deepEqual(['homing', 'slow', 'bomb', 'life'].map(text), ['HOMING', 'SLOW', '+1 BOMB', '+1 LIFE']);
  const life = react({ type: 'pickup', kind: 'life', x: 500, y: 700, points: 500 });
  assert.equal(life.rings[0].color, powerColor('life'));
  assert.ok(life.particles.length > 0);
});

test('a slow power event turns the slow tint on and the next power event for anything else turns it off', () => {
  const fx = react({ type: 'power', kind: 'slow', on: true });
  assert.equal(fx.slowPower, true);
  applyEvent(fx, { type: 'power', kind: 'spread', on: true }, makeRng(1)); // slow waits in the reserve, silently
  assert.equal(fx.slowPower, false);
  applyEvent(fx, { type: 'power', kind: 'spread', on: false }, makeRng(1));
  applyEvent(fx, { type: 'power', kind: 'slow', on: true }, makeRng(1)); // the reserve takes over
  assert.equal(fx.slowPower, true);
  applyEvent(fx, { type: 'power', kind: 'slow', on: false }, makeRng(1));
  assert.equal(fx.slowPower, false);
});

test("Code Rain's bullet time and the slow power switch the tint on and off apart", () => {
  const rng = makeRng(1);
  const fx = react({ type: 'bulletTime', on: true, left: 2 });
  applyEvent(fx, { type: 'power', kind: 'slow', on: true }, rng);
  applyEvent(fx, { type: 'bulletTime', on: false }, rng);
  assert.deepEqual([fx.bulletTime, fx.slowPower], [false, true], 'bullet time ending leaves slow running');
  applyEvent(fx, { type: 'bulletTime', on: true, left: 2 }, rng);
  applyEvent(fx, { type: 'power', kind: 'slow', on: false }, rng);
  assert.deepEqual([fx.bulletTime, fx.slowPower], [true, false], 'slow ending leaves bullet time running');
});

test('fed the real core, the slow tint is on exactly while the ship runs the slow power', () => {
  const world = playing(level([wave({ cols: 3 })]));
  const fx = createFx();
  const rng = makeRng(3);
  const tick = () => {
    step(world, 1);
    for (const ev of drain(world)) applyEvent(fx, ev, rng, world);
    assert.equal(fx.slowPower, world.ship.power?.kind === 'slow', `power ${world.ship.power?.kind}`);
  };
  const take = (kind) => world.pickups.push(makePickup(kind, world.ship.x, world.ship.y));
  take('slow');
  tick();
  assert.equal(fx.slowPower, true);
  take('rapid'); // slow goes to the reserve
  tick();
  assert.equal(world.ship.reserve.kind, 'slow');
  world.ship.power.left = 0.01; // rapid ends, slow takes over
  tick();
  assert.equal(world.ship.power.kind, 'slow');
  world.ship.power.left = 0.01; // and ends for good
  tick();
  assert.equal(world.ship.power, null);
});
