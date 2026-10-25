import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { look, sprites, LANTERN, mid, reef, paint, LW, MID_H, REEF_H, inside, dims, warm, amberish } from './deep-reef-kit.js';

// Lantern Deep's mid layer (the kelp wood) and near layer (the reef): what they light and mark, that every shape and every
// sprite of the sway fits its canvas, and that the files follow the sprite rules (deep-sway.test.js has the swaying
// itself, deep-look.test.js the look as a whole, deep-sky.test.js the far layer and the sky).

test('the mid layer lights a few cool windows and many small sparks, every light a place, a size, a colour and a mode, none amber', () => {
  const { lights } = mid;
  assert.ok(lights.length >= 35 && lights.length <= 80, `${lights.length} lights`);
  for (const l of lights) {
    assert.ok(Number.isFinite(l.x + l.y + l.r + l.ph) && l.color && ['steady', 'pulse', 'flicker', 'blink'].includes(l.mode), JSON.stringify(l));
    assert.ok(l.x >= 0 && l.x <= LW && l.y >= 0 && l.y <= MID_H, `a light in the layer: ${Math.round(l.x)},${Math.round(l.y)}`);
    assert.ok(l.r >= 6 && l.r <= 140 && l.a <= 0.5, `${l.color} r ${l.r} alpha ${l.a}: small and dim`);
    assert.ok(!amberish(l.color), `${l.color} is not an amber`);
  }
  assert.ok(lights.filter((l) => l.color === look.layers[1].lamp).length >= 4, 'portholes and a flue lit in the lamp colour');
  assert.ok(lights.filter((l) => warm(l.color) && l.color !== '#ff6f9c' && l.color !== '#d08aff').length <= 2, 'at most the captain\'s window is gold');
  assert.ok(lights.filter((l) => l.mode === 'flicker').length >= 1 && lights.filter((l) => l.mode === 'pulse').length >= 25 && lights.filter((l) => l.mode === 'blink').length >= 2);
  assert.ok(lights.filter((l) => l.color === '#3de8d0' || l.color === '#b27cff').length >= 10, 'sparks of teal and violet');
});

test('the mid layer marks its hero strands of kelp for the sway: a handful, standing on the bed, of three palettes and different heights', () => {
  const kelp = mid.signs.filter((s) => s.kelp);
  assert.ok(kelp.length >= 12 && kelp.length <= 16, `${kelp.length} strands`);
  assert.equal(mid.signs.length, kelp.length, 'nothing else is marked');
  for (const s of kelp) {
    assert.ok(s.x > 0 && s.x < LW && s.y > MID_H * 0.7 && s.y < MID_H * 0.92, `a strand stands on the bed: ${Math.round(s.x)},${Math.round(s.y)}`);
    assert.ok(s.h >= 110 && s.h <= 260 && Number.isFinite(s.ph) && [0, 1, 2].includes(s.k), JSON.stringify(s));
  }
  assert.equal(new Set(kelp.map((s) => s.k)).size, 3, 'all three palettes');
  assert.ok(Math.max(...kelp.map((s) => s.h)) - Math.min(...kelp.map((s) => s.h)) > 60, 'heights differ');
});

test('the near layer lights its gate with warm lanterns high up, its worms and anemones with small cool lights, and nothing amber or warm in its lower third', () => {
  const { lights } = reef;
  const low = REEF_H * (2 / 3);
  assert.ok(lights.length >= 14 && lights.length <= 45, `${lights.length} lights`);
  const gold = lights.filter((l) => l.color === look.layers[2].lamp && l.r <= 40);
  assert.ok(gold.length >= 5, `${gold.length} lanterns`);
  assert.ok(gold.every((l) => (l.mode === 'steady' || l.mode === 'flicker') && l.r === LANTERN.r && l.a === LANTERN.a && l.y <= REEF_H * 0.55), 'lanterns burn steady or gutter, up in the gate (deep-look.test.js keeps warm lights out of the reef below 55%)');
  assert.ok(gold.some((l) => l.mode === 'steady') && gold.some((l) => l.mode === 'flicker'));
  for (const l of lights) {
    assert.ok(Number.isFinite(l.x + l.y + l.r + l.ph) && l.color && l.mode && l.x >= 0 && l.x <= LW && l.y >= 0 && l.y <= REEF_H, JSON.stringify(l));
    assert.ok(!amberish(l.color), `${l.color} is not an amber`);
    if (l.y > low) assert.ok(l.r <= 26 && l.a <= 0.35 && !warm(l.color), `${l.color} r ${l.r} alpha ${l.a} at y ${Math.round(l.y)}: small and cool where the ship flies`);
    else if (warm(l.color)) assert.ok(l.color === look.layers[2].lamp && l.a <= 0.4, `${l.color}: only the lanterns are warm`);
  }
  assert.ok(lights.filter((l) => l.mode === 'pulse' && (l.color === '#3de8d0' || l.color === '#b27cff')).length >= 6, 'worms, anemones and sparks pulse in teal and violet');
  assert.ok(lights.some((l) => l.r >= 100 && l.color === look.layers[2].lamp && l.a <= 0.1), 'a faint glow fills the gateway');
});

test('the near layer marks its anemones, tufts of grass and tube worms for the sway, each standing on the bed', () => {
  const by = (key) => reef.signs.filter((s) => s[key]);
  const [anemones, grass, worms] = [by('anemone'), by('grass'), by('worm')];
  assert.equal(anemones.length, 4);
  assert.ok(anemones.every((s) => s.n === 5 && s.r >= 26 && s.r <= 40 && [0, 1, 2].includes(s.k)));
  assert.ok(grass.length >= 8 && grass.every((s) => s.h >= 40 && s.h <= 90 && [0, 1].includes(s.k)), `${grass.length} tufts`);
  assert.ok(worms.length >= 6 && worms.length <= 9 && worms.every((s) => s.s >= 0.9 && s.s <= 1.4 && s.ph >= 0 && s.ph < 1), `${worms.length} worms`);
  assert.equal(reef.signs.length, anemones.length + grass.length + worms.length, 'nothing else is marked');
  for (const s of reef.signs) assert.ok(s.x > 0 && s.x < LW && s.y > REEF_H * 0.55 && s.y < REEF_H, `${Math.round(s.x)},${Math.round(s.y)}: on the bed or above it`);
  assert.ok(Math.max(...worms.map((s) => s.x)) - Math.min(...worms.map((s) => s.x)) > 800, 'worms in bunches far apart');
});

test('both layers paint every shape inside their canvases (a little over at the sides) and are the same from one build to the next', () => {
  for (const [name, l] of [['mid', mid], ['near', reef]]) {
    const b = l.T.bounds;
    assert.ok(b.x0 >= -40 && b.x1 <= LW + 40, `${name} within the sides: ${Math.round(b.x0)}..${Math.round(b.x1)}`);
    assert.ok(b.y0 >= 0 && b.y1 <= l.h + 40, `${name} within top and bottom: ${Math.round(b.y0)}..${Math.round(b.y1)}`);
  }
  const again = paint(2);
  assert.deepEqual(again.lights, reef.lights);
  assert.deepEqual(again.signs, reef.signs);
  assert.notDeepEqual(paint(2, 6).lights, reef.lights, 'another seed, another reef');
});

test('every sprite of the sway fits its canvas: the kelp segments stand on their pivot, the tentacle, the tuft and the crown keep their glow', () => {
  const all = [];
  for (let k = 0; k < 3; k++) all.push(...sprites.kelpSegs(k), sprites.tentacle(k), sprites.crown(k));
  all.push(sprites.tuft(0), sprites.tuft(1));
  for (const c of all) assert.ok(inside(c, 1), dims(c));
  const [seg, tent, tuft, crown] = [sprites.kelpSegs(0)[0], sprites.tentacle(0), sprites.tuft(0), sprites.crown(0)];
  assert.deepEqual([seg.width, seg.height], [sprites.SEG.w, sprites.SEG.h]);
  assert.deepEqual([tent.width, tent.height], [sprites.TENT.w, sprites.TENT.h]);
  assert.deepEqual([tuft.width, tuft.height], [sprites.TUFT.w, sprites.TUFT.h]);
  assert.deepEqual([crown.width, crown.height], [sprites.CROWN.w, sprites.CROWN.h]);
  for (let k = 0; k < 3; k++) {
    const segs = sprites.kelpSegs(k);
    assert.equal(segs.length, sprites.SEG.n);
    segs.forEach((c) => {
      assert.ok(c.T.bounds.y1 >= sprites.SEG.py - 1, 'a segment runs down to its foot');
      assert.ok(c.T.bounds.y0 <= 4, 'and up to its head, where the next one stands');
      assert.ok(c.T.bounds.x0 <= sprites.SEG.px - 10 && c.T.bounds.x1 >= sprites.SEG.px + 10, 'with blades either side of the stipe');
    });
  }
  assert.ok(tent.T.bounds.y1 >= sprites.TENT.py && tent.T.bounds.y0 <= 14, 'the tentacle runs from its foot to its tip');
  assert.ok(Math.abs((crown.T.bounds.x0 + crown.T.bounds.x1) / 2 - sprites.CROWN.px) < 6, 'the crown fans evenly round its mouth');
  assert.ok(sprites.kelpSegs(0)[1] === sprites.kelpSegs(0)[1] && sprites.tentacle(2) === sprites.tentacle(2), 'baked once and kept');
});

test("Lantern Deep's mid and near layers and their sway follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^(parallax-deep-mid|parallax-deep-reef|parallax-deep-kit-2|flourish-deep-sway)/.test(n));
  assert.ok(files.length >= 11, `${files.length} files: ${files.join(' ')}`);
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    assert.ok(/^\/\//.test(src), `${name} opens with a comment on what it draws`);
  }
});
