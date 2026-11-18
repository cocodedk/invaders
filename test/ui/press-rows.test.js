import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_ART } from '../../src/ui/bosses/bake.js';
import { TYPE, FONTS } from '../../src/ui/trailer/draw.js';
import { REVEAL } from '../../src/ui/trailer/reveal.js';
import editor from '../../src/ui/bosses/editor.js';

// World 20's per-world rows (part 7.2): its boss art is registered and its trailer cards have a style.
const PRESS = 20;

test('the Night Editor\'s art is registered in BOSS_ART under its kind', () => {
  assert.equal(BOSS_ART.editor, editor);
});

test('world 20 has a trailer typography row of its own, with a known font and reveal', () => {
  const style = TYPE[PRESS - 1];
  assert.ok(style, 'a row for world 20');
  assert.ok(Object.values(FONTS).includes(style.font));
  assert.equal(typeof REVEAL[style.reveal], 'function');
  for (const [i, other] of TYPE.slice(0, PRESS - 1).entries()) assert.notDeepEqual(style, other, `world ${i + 1}`);
});
