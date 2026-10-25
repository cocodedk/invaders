import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { def, art, look, S, lit, HUD, PAD, f } from './carousel-kit.js';

// The Grand Carousel's art under stand-in canvases: what each part puts on the lights layer, and where the art lies
// against the boss's box (and the HUD above it). The live extras are carousel-live.test.js.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');

test('the carousel is drawn once as its left horse and lantern, mirrored for the right; one rage layer per phase', () => {
  for (const base of ['horse', 'lamp']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crown', 'organ', 'drum']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the carousel at its slowest');
  assert.equal(typeof art.live, 'function', 'the canopy, bulbs, pennants and riders are live extras');
  assert.equal(typeof art.warm, 'function', 'whose sprites are baked ahead of the fight');
  assert.equal(art.crack, '#ffb54a');
});

test('the hull, every part and the later phases paint lights: bulbs, windows, cyan pipes, lenses and flames', () => {
  const hull = recorder();
  art.hull(recorder().ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 40, `the hull lights: ${lit(hull.calls)}`);
  for (const p of def.parts) {
    const [paint] = painterFor(art, p.id);
    const b = recorder();
    const l = recorder();
    paint(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 3, `${p.id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls), `${p.id} has a body too`);
  }
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 8, `phase ${phase} glows under the canopy and round the weak points`);
  }
});

test('the whole boss bakes, damage states and all, with a rage layer for the second and third phases', () => {
  const B = warmBoss(look, 'carousel');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
});

test('nothing opaque on the hull or a part rises into the HUD, and every part stays on its canvas', () => {
  const hull = tracker();
  art.hull(hull.ctx, recorder().ctx, S);
  assert.ok(hull.bounds.y0 - 2.5 >= HUD, `the hull's highest point: ${f(hull.bounds.y0)}`);
  assert.ok(hull.bounds.y1 <= def.size.h / 2 + 60 && Math.abs(hull.bounds.x0) <= PAD && hull.bounds.x1 <= PAD, 'and it lies inside the box and its pad');
  for (const p of def.parts) {
    const b = tracker();
    painterFor(art, p.id)[0](b.ctx, recorder().ctx, p, S);
    assert.ok(p.dy + b.bounds.y0 - 2.5 >= HUD, `${p.id}'s highest point: ${f(p.dy + b.bounds.y0)}`);
    const m = art.margins?.[p.id] ?? art.margin ?? 34;
    assert.ok(-b.bounds.x0 <= p.w / 2 + m && b.bounds.x1 <= p.w / 2 + m, `${p.id} is within its canvas side to side: ${f(b.bounds.x0)}..${f(b.bounds.x1)}`);
    assert.ok(-b.bounds.y0 <= p.h / 2 + m && b.bounds.y1 <= p.h / 2 + m, `${p.id} is within its canvas top to bottom: ${f(b.bounds.y0)}..${f(b.bounds.y1)}`);
    const l = tracker(); // and so are its lights
    painterFor(art, p.id)[0](recorder().ctx, l.ctx, p, S);
    assert.ok(-l.bounds.y0 <= p.h / 2 + m && l.bounds.y1 <= p.h / 2 + m && -l.bounds.x0 <= p.w / 2 + m && l.bounds.x1 <= p.w / 2 + m, `${p.id}'s lights are within its canvas`);
  }
  art.rage.forEach((paint, i) => {
    if (!paint) return;
    const l = tracker();
    paint(l.ctx, S);
    assert.ok(l.bounds.y1 <= S.H / 2 && l.bounds.y0 >= -S.H / 2 && Math.abs(l.bounds.x0) <= S.W / 2 && l.bounds.x1 <= S.W / 2, `phase ${i}'s glow ends inside the hull's canvas, so it is not cut off`);
  });
});

test("the carousel's painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^carousel.*\.js$/.test(n));
  assert.ok(files.length >= 12, 'the carousel is split over many files');
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
