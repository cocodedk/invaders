import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNKER } from '../../src/core/bunkers.js';
import { LOOKS } from '../../src/ui/looks/index.js';
import { art, ROLE_LIST } from '../../src/ui/aliens/bake.js';
import { SKINS } from '../../src/ui/bunker-skins.js';
import { FRAMES } from '../../src/ui/pickup-skins.js';
import { rgb } from '../../src/ui/sprites.js';
import { recorder } from './dom-kit.js';

// Starlit Archive's guards, bunkers and pickup rim (art.test.js has the other worlds').

test('every Starlit Archive guard burns on its lights layer on both beats: the ink wisp, crane, spellbook, owl and lantern moth', () => {
  const look = LOOKS[11];
  assert.equal(look.world, 12);
  for (const role of ROLE_LIST) {
    for (const f of [0, 1]) {
      const [b, l] = [recorder(), recorder()];
      art(look)[role](b.ctx, l.ctx, f, look.palette.alien[role]);
      const lit = l.calls.filter(([k]) => ['fill', 'fillRect', 'stroke'].includes(k)).length;
      assert.ok(lit >= 5, `${role} frame ${f}: ${lit} fills and strokes of light`);
      assert.ok(b.calls.length > lit * 3, `${role} frame ${f} has a body under its lights`);
    }
  }
  assert.equal(art(look).crack, '#ffd27a', 'the owl cracks with gold showing in the splits');
});

test("the spellbook's two beats are two drawings: shut with a seam of light, and thrown open with a bolt at its foot", () => {
  const look = LOOKS[11];
  const draw = (f) => {
    const [b, l] = [recorder(), recorder()];
    art(look).gunner(b.ctx, l.ctx, f, look.palette.alien.gunner);
    return { b: b.calls.length, l: l.calls.length };
  };
  const [shut, open] = [draw(0), draw(1)];
  assert.ok(open.l > shut.l * 1.5, `${open.l} calls of light open against ${shut.l} shut: the spell gathers`);
  assert.notEqual(open.b, shut.b);
});

test("Starlit Archive's bunkers are stacks of old books: courses with dark gaps, gilt bands and title plates, leaf edges showing", () => {
  const P = {};
  for (const k of ['fill', 'light', 'dark', 'edge', 'accent']) P[k] = rgb(LOOKS[11].bunker[k]);
  const seen = new Map();
  let gaps = 0;
  for (let y = 0; y < BUNKER.h; y++) {
    let row = 0;
    for (let x = 0; x < BUNKER.w; x++) {
      const [c] = SKINS.tomes(x, y, BUNKER.w, BUNKER.h, P);
      const name = Object.entries(P).find(([, v]) => v === c)?.[0];
      seen.set(name, (seen.get(name) ?? 0) + 1);
      if (name === 'dark') row++;
    }
    if (row === BUNKER.w) gaps++;
  }
  assert.ok(gaps >= 4 && gaps <= 8, `${gaps} joints between courses, each running the whole width`);
  assert.ok(seen.get('accent') > 60, `${seen.get('accent')} px of page edge`);
  assert.ok(seen.get('light') > 800, `${seen.get('light')} px of gilt and worn corners`);
  assert.ok(seen.get('dark') > 1500, `${seen.get('dark')} px of gaps, plates and dark leather`);
  assert.ok(seen.get('fill') > BUNKER.w * BUNKER.h * 0.3, 'a good share of plain leather');
});

test("Starlit Archive's pickup rim is a wreath of gold leaf, twelve leaves", () => {
  const { ctx, calls } = recorder();
  FRAMES[12](ctx, '#ffd45a');
  assert.ok(calls.filter(([k]) => k === 'rotate').length >= 12, 'one turn for each leaf');
  assert.ok(calls.filter(([k]) => k === 'fill').length >= 25, 'the dark middle, a leaf each, and the beads');
  assert.equal(calls.filter(([k]) => k === 'save').length, calls.filter(([k]) => k === 'restore').length, 'every leaf puts the transform back');
});
