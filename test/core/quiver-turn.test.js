import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drain, ofType } from './world-kit.js';
import { start, fireOne, until } from './quiver-kit.js';

test('a turning arrow emits arrowTurn once, on the tick it turns, at the turn point', () => {
  const w = start();
  const s = fireOne(w);
  const early = [];
  until(w, () => s.turned, () => {
    early.push(...ofType(drain(w), 'arrowTurn'));
    return undefined;
  });
  assert.equal(early.length, 0, 'none before the turn');
  const turns = ofType(drain(w), 'arrowTurn');
  assert.equal(turns.length, 1);
  assert.deepEqual([turns[0].x, turns[0].y, turns[0].tick], [s.x, s.y, w.tick]);
  until(w, () => s.life <= 0 || !w.shots.includes(s));
  assert.equal(ofType(drain(w), 'arrowTurn').length, 0, 'a shot turns once');
});
