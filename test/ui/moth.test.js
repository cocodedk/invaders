import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { def, art, look, S, lit, HUD, PAD, f } from './moth-kit.js';

// The Vesper Moth under stand-in canvases: how it is built (the painters, which parts are painted as a left twin and
// mirrored), what each puts on the lights layer, where the art lies against the boss's box (and the HUD above it), and
// that the whole boss bakes. The wingbeat's frames are moth-wing.test.js, the live extras moth-live.test.js, the
// geometry of the parts moth-parts.test.js.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');

test('the moth is drawn as its left wing and eyespot, mirrored for the right; one rage layer per phase', () => {
  for (const base of ['wing', 'spot']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crown', 'heart', 'tail']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the moth at rest');
  assert.equal(typeof art.rage[1], 'function');
  assert.equal(typeof art.rage[2], 'function');
  assert.equal(typeof art.live, 'function', 'the wingbeat and the light are live extras');
  assert.equal(typeof art.warm, 'function', 'whose frames are baked ahead of the fight');
  assert.equal(art.crack, '#ffe9b0', 'a crack leaks the weak points hot gold');
  assert.ok(art.margins.wingL >= 50 && art.margins.wingR === art.margins.wingL, 'the wings are margined for their beat');
});

test('the hull and every part paint lights: panes that glow, a rose window, rings, slits; the weak parts the most', () => {
  const hull = recorder();
  const body = recorder();
  art.hull(body.ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 30, `the hull lights: ${lit(hull.calls)}`);
  assert.ok(lit(body.calls) > lit(hull.calls) * 5, 'the hull is mostly body: carved stone and glass');
  const light = {};
  for (const p of def.parts) {
    const b = recorder();
    const l = recorder();
    painterFor(art, p.id)[0](b.ctx, l.ctx, p, S);
    light[p.id] = lit(l.calls);
    assert.ok(lit(l.calls) >= 6, `${p.id}: ${lit(l.calls)} lights`);
    assert.ok(lit(b.calls) > lit(l.calls), `${p.id} has a body too`);
  }
  for (const weak of ['heart', 'spotL', 'tail']) assert.ok(light[weak] >= 8, `${weak} glows: ${light[weak]}`);
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 5, `phase ${phase} adds light`);
  }
  const [h, o] = [recorder(), recorder()];
  art.rage[1](h.ctx, S);
  art.rage[2](o.ctx, S);
  assert.ok(lit(o.calls) > lit(h.calls), 'the last phase lights more of the moth');
});

test('the whole boss bakes, damage states and all, with a rage layer for the second and third phases', () => {
  const B = warmBoss(look, 'moth');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
  for (const p of def.parts) assert.ok(B.parts[p.id].cracks[1] && B.parts[p.id].cracks[2], `${p.id} has its cracked states`);
  for (const id of ['crown', 'wingL', 'wingR']) assert.ok(B.parts[id].exposed, `${id} can be split open`);
  assert.ok(B.hull.flash, 'and the hull has its collapse flash');
});

test('nothing on the hull or a part rises into the HUD, and each stays on its canvas', () => {
  const hull = tracker();
  const hullLights = tracker();
  art.hull(hull.ctx, hullLights.ctx, S);
  assert.ok(hull.bounds.y0 - 2.5 >= HUD, `the hull's highest point: ${f(hull.bounds.y0)}`);
  assert.ok(hullLights.bounds.y0 >= HUD - 2.5, `the hull's lights: ${f(hullLights.bounds.y0)}`);
  for (const b of [hull.bounds, hullLights.bounds]) {
    assert.ok(b.y1 <= S.H / 2 && b.y0 >= -S.H / 2 && -b.x0 <= PAD && b.x1 <= PAD, `the hull lies inside the box and its pad: ${f(b.x0)}..${f(b.x1)}, ${f(b.y0)}..${f(b.y1)}`);
  }
  for (const p of def.parts) {
    const b = tracker();
    const l = tracker();
    painterFor(art, p.id)[0](b.ctx, l.ctx, p, S);
    const m = art.margins?.[p.id] ?? art.margin ?? 34;
    for (const [what, t, room] of [['art', b.bounds, 2.5], ['lights', l.bounds, -2.5]]) { // the art keeps clear by its stroke's width, the lights may fall off at the line
      assert.ok(p.dy + t.y0 >= HUD + room, `${p.id}'s ${what} stop under the HUD: ${f(p.dy + t.y0)}`);
      assert.ok(-t.x0 <= p.w / 2 + m && t.x1 <= p.w / 2 + m, `${p.id}'s ${what} are within the canvas side to side: ${f(t.x0)}..${f(t.x1)}`);
      assert.ok(-t.y0 <= p.h / 2 + m && t.y1 <= p.h / 2 + m, `${p.id}'s ${what} are within the canvas top to bottom: ${f(t.y0)}..${f(t.y1)}`);
    }
  }
  art.rage.forEach((paint, i) => {
    if (!paint) return;
    const l = tracker();
    paint(l.ctx, S);
    assert.ok(l.bounds.y1 <= S.H / 2 && l.bounds.y0 >= HUD - 2.5 && Math.abs(l.bounds.x0) <= S.W / 2 && l.bounds.x1 <= S.W / 2, `phase ${i}'s glow ends inside the hull's canvas, under the HUD: ${f(l.bounds.y0)}..${f(l.bounds.y1)}`);
  });
});

test('the crown keeps its antennae under y -158 and the eyespots sit in the hindwings', async () => {
  const { antenna, SHAFT, at } = await import('../../src/ui/bosses/moth-antenna.js');
  const { EYE_AT } = await import('../../src/ui/bosses/moth-hind.js');
  const crown = def.parts.find((p) => p.id === 'crown');
  assert.equal(crown.dy - crown.h / 2, HUD, 'the crown box tops out at the HUD line');
  const b = tracker();
  antenna(b.ctx);
  assert.ok(crown.dy + b.bounds.y0 - 2.5 >= HUD, `the antenna's highest point: ${f(crown.dy + b.bounds.y0)}`);
  for (let u = 0; u <= 1; u += 0.02) assert.ok(crown.dy + at(u)[1] > HUD + 12, `the shaft at ${u.toFixed(2)} leaves room for its barbs`);
  assert.ok(SHAFT.at(-1)[1] > SHAFT[0][1] - 30, 'it curls back down at its tip');
  const spot = def.parts.find((p) => p.id === 'spotL');
  assert.deepEqual(EYE_AT, [spot.dx, spot.dy], 'the hindwing is a rose window round the left eyespot');
});

test("the moth's own painters follow the sprite rules: no shadow blur, no clock or dice, files under 200 lines", () => {
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const files = readdirSync(dir).filter((n) => /^moth(-.*)?\.js$/.test(n));
  assert.ok(files.length >= 14, `the moth is split over many files: ${files.join(', ')}`);
  for (const name of files) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
