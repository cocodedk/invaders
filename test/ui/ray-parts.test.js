import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { canvases, def, art, look, S, HUD, PAD, f, part, margin, lit, painter, paint, peak } from './ray-kit.js';

// The Squall Ray's art (the hard half: ray-hull.js, ray-mass.js, ray-seat.js, ray-glow.js, ray-vein.js, ray-tip.js, ray-eye.js, ray-spine.js, ray-wing.js and ray-lame.js,
// ray-heart.js, ray-maw.js, ray-coil.js and ray-coil-lit.js, ray-rage.js, glued by ray.js; the live half is ray-live.test.js): how the module is built (which parts are
// painted as a left twin and mirrored, the rage layers), what each paints on the lights layer (the weak points hot, the armour dim), where the art lies against the boss's
// box and the HUD above it, and that no file reaches for chance or the clock. What the art is drawn as (the silhouette, the coil, the heart, the fade at the HUD) is
// ray-form.test.js.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');

const ids = ['spine', 'heart', 'wingL', 'wingR', 'coilL', 'coilR', 'maw'];
const WEAK = ['heart', 'coilL', 'coilR', 'maw'];

test('the wing and the coil are painted once, as the left ones, and mirrored for the right; one rage layer per phase', () => {
  for (const base of ['wing', 'coil']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['spine', 'heart', 'maw']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the ray gliding');
  assert.equal(typeof art.rage[1], 'function');
  assert.equal(typeof art.rage[2], 'function');
  assert.equal(art.crack, '#c8f6ff', 'a crack has a white-cyan core, the colour of the lightning, not a warm one that turns olive on dark iron');
  assert.equal(art.pad, 80, 'a wider pad than the others: the wing tips and their glow reach to x 500');
  for (const id of ids) assert.ok(Number.isFinite(art.margins[id]), `${id} has a margin of its own`);
  assert.equal(typeof art.live, 'function');
  assert.equal(typeof art.warm, 'function');
  assert.equal(art.behind, undefined, 'the cloud is a baked hull; only the lights move');
});

test('the hull paints a body of cloud and its lights; every part paints a body and lights, the weak points blaze and the armour keeps to seams of cold light', () => {
  const [hb, hl] = [recorder(), recorder()];
  art.hull(hb.ctx, hl.ctx, S);
  assert.ok(hb.calls.length >= 1 && lit(hl.calls) >= 8, `the hull lays the cloud on the hull, and lights it from within: ${lit(hl.calls)}`);
  for (const p of def.parts) {
    const [b, l] = [recorder(), recorder()];
    painter(p.id)(b.ctx, l.ctx, p, S);
    assert.ok(lit(l.calls) >= 8, `${p.id} has lights: ${lit(l.calls)}`);
    assert.ok(lit(b.calls) > lit(l.calls), `${p.id} has a body too`);
  }
  for (const w of WEAK) assert.ok(peak(w) >= 0.8, `${w} blazes: ${peak(w).toFixed(2)}`);
  for (const a of ['spine', 'wingL']) assert.ok(peak(a) <= 0.75, `${a} keeps to seams of cold light: ${peak(a).toFixed(2)}`);
  assert.equal(peak('wingL'), peak('wingR'), 'the twins are one painter');
  assert.equal(peak('coilL'), peak('coilR'));
});

test('the rage layers add light, the last phase more than the first', () => {
  const count = (i) => {
    const l = recorder();
    art.rage[i](l.ctx, S);
    return lit(l.calls);
  };
  assert.ok(count(1) >= 8, `the hover phase adds light: ${count(1)}`);
  assert.ok(count(2) > count(1) * 1.5, `the orbit phase lights more of the ray: ${count(2)} against ${count(1)}`);
});

test('the whole boss bakes, damage states and all, a rage layer for the second and third phases, and every part is baked', () => {
  const B = warmBoss(look, 'ray');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
  for (const p of def.parts) assert.ok(B.parts[p.id].cracks[1] && B.parts[p.id].cracks[2], `${p.id} has its cracked states`);
  for (const id of ['spine', 'wingL', 'wingR']) assert.ok(B.parts[id].exposed, `${id} can be split open`);
  assert.ok(B.hull.flash, 'and the hull has its collapse flash');
});

test('nothing on the hull, a part or a rage layer rises into the HUD, and each stays on its canvas', () => {
  const before = canvases.length;
  const hull = tracker();
  const hullLights = tracker();
  art.hull(hull.ctx, hullLights.ctx, S);
  assert.ok(hull.bounds.y0 >= HUD - 0.01, `the hull's highest point: ${f(hull.bounds.y0)}`);
  assert.ok(hullLights.bounds.y0 >= HUD - 2.5, `the hull's lights: ${f(hullLights.bounds.y0)}`);
  for (const b of [hull.bounds, hullLights.bounds]) {
    assert.ok(b.y1 <= S.H / 2 && b.y0 >= -S.H / 2 && -b.x0 <= PAD && b.x1 <= PAD, `the hull lies inside the box and its pad: ${f(b.x0)}..${f(b.x1)}, ${f(b.y0)}..${f(b.y1)}`);
  }
  const cloud = canvases[before];
  assert.ok(Number.isFinite(cloud.T.bounds.y0) && cloud.T.bounds.y0 >= HUD - 0.01, `the body of cloud, painted on a canvas of its own, stops at the HUD's line: ${f(cloud.T.bounds.y0)}`);
  for (const c of canvases.slice(before)) assert.ok(!(c.T.bounds.y0 < HUD - 0.01), 'and so does every canvas the hull made');
  for (const p of def.parts) {
    const { b, l } = paint(p.id);
    const m = margin(p.id);
    for (const [what, t, room] of [['art', b, 2.5], ['lights', l, -2.5]]) {
      assert.ok(p.dy + t.y0 >= HUD + room, `${p.id}'s ${what} stop under the HUD: ${f(p.dy + t.y0)}`);
      assert.ok(-t.x0 <= p.w / 2 + m && t.x1 <= p.w / 2 + m, `${p.id}'s ${what} are within the canvas side to side: ${f(t.x0)}..${f(t.x1)}`);
      assert.ok(-t.y0 <= p.h / 2 + m && t.y1 <= p.h / 2 + m, `${p.id}'s ${what} are within the canvas top to bottom: ${f(t.y0)}..${f(t.y1)}`);
    }
  }
  art.rage.forEach((paintRage, i) => {
    if (!paintRage) return;
    const l = tracker();
    paintRage(l.ctx, S);
    assert.ok(l.bounds.y1 <= S.H / 2 && l.bounds.y0 >= HUD - 2.5 && Math.abs(l.bounds.x0) <= S.W / 2 && l.bounds.x1 <= S.W / 2, `phase ${i}'s glow ends inside the hull's canvas, under the HUD: ${f(l.bounds.y0)}..${f(l.bounds.y1)}`);
  });
});

test('painting twice makes the same picture: nothing uses chance or the clock; every file starts with its comment and stays under 200 lines', () => {
  const once = (id) => {
    const b = tracker();
    const l = tracker();
    painter(id)(b.ctx, l.ctx, part(id), S);
    return [b.calls.length, l.calls.length, ...Object.values(b.bounds).map(f), ...Object.values(l.bounds).map(f)];
  };
  for (const id of ids) assert.deepEqual(once(id), once(id), id);
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const names = readdirSync(dir).filter((n) => /^ray(-.*)?\.js$/.test(n));
  assert.ok(names.length >= 23, `${names.length} files`);
  for (const n of names) {
    const text = readFileSync(new URL(n, dir), 'utf8');
    const src = text.replace(/\/\/.*$/gm, '');
    assert.ok(!/Math\.random|Date\.now|performance\.now|shadowBlur/.test(src), `${n} uses chance, the clock or shadowBlur`);
    assert.ok(text.startsWith('//'), `${n} starts with its comment`);
    assert.ok(text.split('\n').length < 200, `${n} is ${text.split('\n').length} lines`);
    assert.ok(!/cached\(\s*['"`]/.test(src) || /cached\(\s*['"`]ray/.test(src), `${n}: sprite keys are prefixed ray`);
  }
});
