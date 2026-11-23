import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { createWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';

// The auto-fire sign in the HUD: shown only while the view's HUD state says auto-fire is on, and kept
// inside the score panel's caption row (the one spot of the band no state of the game uses).
installCanvas();
const { drawHud } = await import('../../src/ui/hud.js');
const { AUTOFIRE_SIGN } = await import('../../src/ui/hud-autofire.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');

function hud(state) {
  const world = createWorld(levelById('w1-1'));
  const { ctx, calls } = recorder();
  drawHud(ctx, world, LOOKS[0], state, 0);
  return calls;
}
const shown = (calls, s) => calls.some(([k, t]) => k === 'fillText' && t === s);

// The points (x, y) of the rounded rects among `calls`: each rect's four arcTo calls hold its corners, two points each.
const cornersOf = (calls) => calls.filter(([k]) => k === 'arcTo').flatMap(([, x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]);
const boxOf = (pts) => {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

test('the sign is on the HUD only while auto-fire is on', () => {
  assert.ok(shown(hud({ autofire: true }), AUTOFIRE_SIGN));
  assert.ok(!shown(hud({ autofire: false }), AUTOFIRE_SIGN));
  assert.ok(!shown(hud({ lag: null }), AUTOFIRE_SIGN), 'a view that never heard of it');
});

test('the sign is the pill drawn right after the SCORE caption: inside the score panel, clear of the caption', () => {
  const off = hud({});
  const on = hud({ autofire: true });
  const panel = boxOf(cornersOf(off).slice(0, 8)); // the first panel the HUD draws is the score's
  const caption = on.findIndex(([k, t]) => k === 'fillText' && t === 'SCORE');
  const text = on.findIndex(([k, t]) => k === 'fillText' && t === AUTOFIRE_SIGN);
  const sign = on.slice(caption + 1, text + 1);
  assert.equal(sign.length, on.length - off.length, 'the sign is all the HUD gained');
  assert.equal(cornersOf(sign).length, 8, 'a rounded pill: one rect');
  const pill = boxOf(cornersOf(sign));
  assert.ok(pill.x0 > on[caption][2] + 100, 'right of the SCORE caption, which is about 100 px wide');
  assert.ok(pill.x0 > panel.x0 && pill.x1 < panel.x1 && pill.y0 > panel.y0 && pill.y1 < panel.y1, 'inside the panel');
  const [, , tx, ty] = on[text];
  assert.ok(tx > pill.x0 && tx < pill.x1 && ty > pill.y0 && ty < pill.y1, 'the words are on the pill');
});
