import { test } from 'node:test';
import assert from 'node:assert/strict';
import { react, run } from './fx-kit.js';
import { TURN_GOLD, TURN_FLASH_LIFE, TURN_ARC_LIFE } from '../../src/fx/react-isle.js';

const turn = { type: 'arrowTurn', x: 1300, y: 90 };

test('an arrow turning flashes gold where it turns, with a gold arc opening round it, and no particles', () => {
  const fx = react(turn, { level: { world: 21 }, ship: { x: 900, y: 900 } });
  assert.equal(fx.flashes.length, 1);
  const [f] = fx.flashes;
  assert.deepEqual([f.x, f.y, f.color, f.tag, f.full], [turn.x, turn.y, TURN_GOLD, 'turn', false]);
  assert.equal(fx.rings.length, 1);
  assert.deepEqual([fx.rings[0].x, fx.rings[0].y, fx.rings[0].color, fx.rings[0].kind], [turn.x, turn.y, TURN_GOLD, 'ring']);
  assert.equal(fx.particles.length, 0);
  run(fx, Math.max(TURN_FLASH_LIFE, TURN_ARC_LIFE) + 1 / 30);
  assert.equal(fx.flashes.length + fx.rings.length, 0, 'gone within its life');
});

test('the turn needs no world and draws no randomness: any seed gives the same flash', () => {
  assert.deepEqual(react(turn, undefined, 3), react(turn, undefined, 9));
});
