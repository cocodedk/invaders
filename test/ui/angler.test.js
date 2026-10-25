import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { def, art, look, S, lit, HUD, PAD, f } from './angler-kit.js';

// The Lantern Leviathan's hull, crest and maw under stand-in canvases: what each puts on the lights layer, and where
// the art lies against the boss's box (and the HUD above it). The fins, eyes, belly and live extras (angler-fin.js,
// -eye.js, -belly.js, -fx.js, the jaw and the ripple) have tests of their own.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');
const MINE = ['crest', 'maw'];

test('the leviathan is drawn once as its left fin and eye, mirrored for the right; one rage layer per phase', () => {
  for (const base of ['fin', 'eye']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crest', 'maw', 'belly']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the beast at its quietest');
  assert.equal(typeof art.rage[1], 'function');
  assert.equal(typeof art.rage[2], 'function');
  assert.equal(typeof art.live, 'function', 'the lure and the lamps are live extras');
  assert.equal(typeof art.warm, 'function', 'whose sprites are baked ahead of the fight');
  assert.equal(art.crack, '#bff4ff', 'the crack is a hot line of the weak points pale cyan');
});

test('the hull, the crest and the maw paint lights: photophores, spine tips, a burning throat; the later phases add more', () => {
  const hull = recorder();
  const body = recorder();
  art.hull(body.ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 80, `the hull lights: ${lit(hull.calls)}`);
  assert.ok(lit(body.calls) > lit(hull.calls), 'the hull is mostly dark body');
  for (const id of MINE) {
    const p = def.parts.find((q) => q.id === id);
    const b = recorder();
    const l = recorder();
    painterFor(art, id)[0](b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= (id === 'maw' ? 20 : 8), `${id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls), `${id} has a body too`);
  }
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 8, `phase ${phase} lights the teeth and the throat`);
  }
  const [h, o] = [recorder(), recorder()];
  art.rage[1](h.ctx, S);
  art.rage[2](o.ctx, S);
  assert.ok(lit(o.calls) > lit(h.calls) * 2, 'the orbit phase lights every lamp and the currents round the head besides');
});

test('the whole boss bakes, damage states and all, with a rage layer for the second and third phases', () => {
  const B = warmBoss(look, 'angler');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
  for (const id of MINE) assert.ok(B.parts[id].cracks[1] && B.parts[id].cracks[2], `${id} has its cracked states`);
});

test('nothing opaque on the hull, the crest or the maw rises into the HUD, and each stays on its canvas', () => {
  const hull = tracker();
  const hullLights = tracker();
  art.hull(hull.ctx, hullLights.ctx, S);
  assert.ok(hull.bounds.y0 - 2.5 >= HUD, `the hull's highest point: ${f(hull.bounds.y0)}`);
  assert.ok(hullLights.bounds.y0 >= HUD - 2.5, `the hull's lights: ${f(hullLights.bounds.y0)}`);
  for (const b of [hull.bounds, hullLights.bounds]) {
    assert.ok(b.y1 <= def.size.h / 2 + 60 && b.y0 >= -S.H / 2 && -b.x0 <= PAD && b.x1 <= PAD, 'and it lies inside the box and its pad');
  }
  for (const id of MINE) {
    const p = def.parts.find((q) => q.id === id);
    const b = tracker();
    painterFor(art, id)[0](b.ctx, tracker().ctx, p, S);
    assert.ok(p.dy + b.bounds.y0 - 2.5 >= HUD, `${id}'s highest point: ${f(p.dy + b.bounds.y0)}`);
    const m = art.margins?.[id] ?? art.margin ?? 34;
    assert.ok(-b.bounds.x0 <= p.w / 2 + m && b.bounds.x1 <= p.w / 2 + m, `${id} is within its canvas side to side: ${f(b.bounds.x0)}..${f(b.bounds.x1)}`);
    assert.ok(-b.bounds.y0 <= p.h / 2 + m && b.bounds.y1 <= p.h / 2 + m, `${id} is within its canvas top to bottom: ${f(b.bounds.y0)}..${f(b.bounds.y1)}`);
    const l = tracker(); // and so are its lights, which stay under the HUD too
    painterFor(art, id)[0](tracker().ctx, l.ctx, p, S);
    assert.ok(-l.bounds.y0 <= p.h / 2 + m && l.bounds.y1 <= p.h / 2 + m && -l.bounds.x0 <= p.w / 2 + m && l.bounds.x1 <= p.w / 2 + m, `${id}'s lights are within its canvas`);
    assert.ok(p.dy + l.bounds.y0 >= HUD - 2.5, `${id}'s lights stop under the HUD: ${f(p.dy + l.bounds.y0)}`);
  }
  art.rage.forEach((paint, i) => {
    if (!paint) return;
    const l = tracker();
    paint(l.ctx, S);
    assert.ok(l.bounds.y1 <= S.H / 2 && l.bounds.y0 >= HUD - 2.5 && Math.abs(l.bounds.x0) <= S.W / 2 && l.bounds.x1 <= S.W / 2, `phase ${i}'s glow ends inside the hull's canvas, under the HUD`);
  });
});

test('the teeth stand on the lips, lean in toward the throat, and the long ones are in the maw\'s chamber', async () => {
  const { TEETH } = await import('../../src/ui/bosses/angler-teeth.js');
  const { upper, lower, CH, CORNER } = await import('../../src/ui/bosses/angler-kit.js');
  for (const row of ['up', 'dn']) {
    assert.ok(TEETH[row].length >= 18, `${row}: ${TEETH[row].length} teeth`);
    for (const t of TEETH[row]) {
      assert.ok(Math.abs(t.y - (row === 'up' ? upper : lower)(t.x)) <= 2.5, `${row} tooth at ${f(t.x)} is rooted in its lip`);
      assert.ok(Math.abs(t.x) <= CORNER, 'and none stands past the corner of the mouth');
      assert.ok(Math.abs(t.x + Math.cos(t.a) * t.len) < Math.abs(t.x), `${row} tooth at ${f(t.x)} leans in`);
    }
    const longest = (inside) => Math.max(...TEETH[row].filter((t) => (Math.abs(t.x) < CH) === inside).map((t) => t.len));
    assert.ok(longest(true) > longest(false), `${row}: the longest fangs are in the chamber`);
  }
});

test("the leviathan's own painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const theirs = /^angler-(fin|eye|belly|fx|lure|sprites)/; // the fins, eyes, belly and live extras are another hand's
  const files = readdirSync(dir).filter((n) => /^angler.*\.js$/.test(n) && !theirs.test(n));
  assert.ok(files.length >= 10, `the hull is split over many files: ${files.join(', ')}`);
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
