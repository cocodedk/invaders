import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_ART } from '../../src/ui/bosses/bake.js';
import { TYPE, FONTS } from '../../src/ui/trailer/draw.js';
import { REVEAL } from '../../src/ui/trailer/reveal.js';
import crowns from '../../src/ui/bosses/crowns.js';

// World 21's per-world rows (part 9): its boss art is registered and its trailer cards have a style.
const ISLE = 21;

test('the Ten-Crowned King\'s art is registered in BOSS_ART under its kind', () => {
  assert.equal(BOSS_ART.crowns, crowns);
});

test('world 21 has a trailer typography row of its own, with a known font and reveal', () => {
  const style = TYPE[ISLE - 1];
  assert.ok(style, 'a row for world 21');
  assert.ok(Object.values(FONTS).includes(style.font));
  assert.equal(typeof REVEAL[style.reveal], 'function');
  for (const [i, other] of TYPE.slice(0, ISLE - 1).entries()) assert.notDeepEqual(style, other, `world ${i + 1}`);
});
