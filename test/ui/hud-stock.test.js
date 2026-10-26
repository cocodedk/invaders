import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';

// Lives and bombs in the HUD's top-right panel: three slots (a full or an empty icon each) while the
// count is 3 or less, and past that one icon with the count as text. Against a recording context.
installCanvas();
const { drawHud } = await import('../../src/ui/hud.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

function hud(lives, bombs) {
  const world = createWorld(levelById('w1-1'));
  Object.assign(world.ship, { lives, bombs, power: null, reserve: null });
  const { ctx, calls } = recorder();
  drawHud(ctx, world, LOOKS[0], {}, 0);
  return {
    ships: calls.filter(([k]) => k === 'closePath').length, // one per ship icon on top of what the rest of the HUD draws
    bombs: calls.filter(([k, , , r]) => k === 'arc' && r === 10).length, // a bomb is a circle of radius 10
    texts: calls.filter(([k]) => k === 'fillText').map((c) => c[1]),
  };
}

test('up to 3, lives and bombs keep their three slots, the missing ones drawn empty', () => {
  const base = hud(3, 3);
  assert.equal(base.bombs, 3);
  for (const [lives, bombs] of [[2, 1], [1, 0], [0, 2]]) {
    const h = hud(lives, bombs);
    assert.equal(h.ships, base.ships, `${lives} lives: still three ship slots`);
    assert.equal(h.bombs, 3, `${bombs} bombs: still three bomb slots`);
    assert.ok(!h.texts.some((t) => t.startsWith('×') && t !== '×1'), 'no count as text (the only × is the combo)');
  }
});

test('past 3, one icon and the count as text, in the same space', () => {
  const base = hud(3, 3);
  const many = hud(7, 12);
  assert.equal(many.ships, base.ships - 2, 'one ship icon where there were three');
  assert.equal(many.bombs, 1, 'one bomb icon where there were three');
  assert.ok(many.texts.includes('×7') && many.texts.includes('×12'), many.texts.join());
  const four = hud(4, 4);
  assert.ok(four.texts.includes('×4'), 'four is past the slots');
  assert.equal(four.bombs, 1);
  assert.ok(hud(99, 250).texts.includes('×250'), 'nothing caps the count');
});
