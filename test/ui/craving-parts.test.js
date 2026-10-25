import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { def, art, look, S, HUD, PAD, f, part, margin, lit, painter, paint, peak } from './craving-parts-kit.js';

// The Craving's throne and parts (the hard half's files: craving-hull.js, craving-throne*.js, craving-crown*.js, craving-maw*.js,
// craving-eye*.js, craving-claw*.js, craving-tray*.js, craving-rage.js, glued by craving.js): how the module is built (which parts are
// painted as a left twin and mirrored, the rage layers), what each paints on the lights layer (the weak points hot, the armour
// nearly dark), where the art lies against the boss's box and the HUD above it, the geometry the throne and the parts share, and
// that no file reaches for chance or the clock.
const { painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');
const geo = await import('../../src/ui/bosses/craving-throne-geo.js');
const { SPIKES } = await import('../../src/ui/bosses/craving-crown.js');
const { RESTS } = await import('../../src/ui/bosses/craving-throne-rim.js');

const { bowl } = await import('../../src/ui/bosses/craving-throne-bowl.js');
const { wall, foot } = await import('../../src/ui/bosses/craving-throne-wall.js');
const { topFace, lipFace, rests } = await import('../../src/ui/bosses/craving-throne-rim.js');
const { heap } = await import('../../src/ui/bosses/craving-throne-heap.js');
const pieces = {
  bowl, wall, foot, heap, rests, lipFace,
  topBack: (b, l) => topFace(b, l, false), topFront: (b, l) => topFace(b, l, true),
};

const ids = ['crown', 'maw', 'clawL', 'clawR', 'eyeL', 'eyeR', 'tray'];

test('the claw and the eye are painted once, as the left ones, and mirrored for the right; one rage layer per phase', () => {
  for (const base of ['claw', 'eye']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['crown', 'maw', 'tray']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the Craving looming');
  assert.equal(typeof art.rage[1], 'function');
  assert.equal(typeof art.rage[2], 'function');
  assert.equal(art.crack, '#ffb347', 'a crack leaks the weak colour');
  assert.equal(art.pad, 60);
  for (const id of ids) assert.ok(Number.isFinite(art.margins[id]), `${id} has a margin of its own`);
});

test('the throne: the hull paints bowl, wall, rim and heaps, and its lights are coals and cracks', () => {
  const b = recorder();
  const l = recorder();
  art.hull(b.ctx, l.ctx, S);
  assert.ok(lit(b.calls) > 800, `the hull's body is rich: ${lit(b.calls)} fills and strokes`);
  assert.ok(lit(l.calls) >= 30, `the hull's lights: ${lit(l.calls)}`);
  assert.ok(lit(b.calls) > lit(l.calls) * 5, 'the hull is mostly body: cast iron and ash');
});

test('every part paints lights; the weak points the most, the armour only a few dull embers', () => {
  const light = {};
  for (const p of def.parts) {
    const b = recorder();
    const l = recorder();
    painter(p.id)(b.ctx, l.ctx, p, S);
    light[p.id] = lit(l.calls);
    assert.ok(lit(b.calls) > lit(l.calls), `${p.id} has a body too`);
  }
  for (const weak of ['maw', 'eyeL', 'eyeR', 'tray']) assert.ok(light[weak] >= 8, `${weak} glows: ${light[weak]}`);
  for (const weak of ['maw', 'eyeL', 'tray']) assert.ok(peak(weak) >= 0.8, `${weak} blazes: ${peak(weak).toFixed(2)}`);
  for (const armor of ['crown', 'clawL', 'clawR']) assert.ok(peak(armor) <= 0.45, `${armor} keeps to dull embers: ${peak(armor).toFixed(2)}`);
  assert.equal(light.eyeL, light.eyeR, 'the twins are one painter');
  for (const phase of [1, 2]) {
    const l = recorder();
    art.rage[phase](l.ctx, S);
    assert.ok(lit(l.calls) >= 10, `phase ${phase} adds light`);
  }
  const [h, o] = [recorder(), recorder()];
  art.rage[1](h.ctx, S);
  art.rage[2](o.ctx, S);
  assert.ok(lit(o.calls) > lit(h.calls) * 1.5, 'the last phase lights more of the throne');
});

test('the whole boss bakes, damage states and all, with the stubs or the smoke body, and a rage layer for the second and third phases', () => {
  const B = warmBoss(look, 'craving');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
  for (const p of def.parts) assert.ok(B.parts[p.id].cracks[1] && B.parts[p.id].cracks[2], `${p.id} has its cracked states`);
  for (const id of ['crown', 'clawL', 'clawR']) assert.ok(B.parts[id].exposed, `${id} can be split open`);
  assert.ok(B.hull.flash, 'and the hull has its collapse flash');
});

test('nothing on the hull, a part or a rage layer rises into the HUD, and each stays on its canvas', () => {
  const hull = tracker();
  const hullLights = tracker();
  art.hull(hull.ctx, hullLights.ctx, S);
  assert.ok(hull.bounds.y0 >= HUD - 0.01, `the hull's highest point (the smoke body's frozen frame is drawn from the line itself): ${f(hull.bounds.y0)}`);
  assert.ok(hullLights.bounds.y0 >= HUD - 2.5, `the hull's lights: ${f(hullLights.bounds.y0)}`);
  for (const b of [hull.bounds, hullLights.bounds]) {
    assert.ok(b.y1 <= S.H / 2 && b.y0 >= -S.H / 2 && -b.x0 <= PAD && b.x1 <= PAD, `the hull lies inside the box and its pad: ${f(b.x0)}..${f(b.x1)}, ${f(b.y0)}..${f(b.y1)}`);
  }
  for (const [name, run] of Object.entries(pieces)) { // the throne's own pieces keep to its budget (the frozen smoke body is drawn from craving-frames.js, not part of the throne's own pieces)
    const t = tracker();
    run(t.ctx, tracker().ctx);
    assert.ok(t.bounds.y1 <= 171 && t.bounds.y0 >= -132 && t.bounds.x1 <= 380 && -t.bounds.x0 <= 380, `${name}: ${f(t.bounds.x0)}..${f(t.bounds.x1)}, ${f(t.bounds.y0)}..${f(t.bounds.y1)}`);
  }
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

test('the crown has nine spikes in a fan, the middle one tallest and reaching the part\'s top exactly', () => {
  const crown = part('crown');
  assert.equal(crown.dy - crown.h / 2, HUD, 'the crown box tops out at the HUD line');
  assert.equal(SPIKES.length, 9);
  const lens = SPIKES.map((s) => s[1]);
  assert.equal(Math.max(...lens), lens[4], 'the middle one is the tallest');
  assert.deepEqual(SPIKES.map((s) => s[0]), [-112, -84, -56, -28, 0, 28, 56, 84, 112], 'evenly across the band');
  assert.ok(new Set(SPIKES.map((s) => s[2])).size >= 4, 'lit, snapped, a stub and a filter end');
  assert.ok(SPIKES.some((s) => s[2] === 'filter'), 'one stands on its head showing its filter');
  const { b } = paint('crown');
  assert.ok(crown.dy + b.y0 >= HUD + 2.4 && crown.dy + b.y0 <= HUD + 12, `the tallest tip, clip and all: ${f(crown.dy + b.y0)}`);
});

test('the throne is a dish: the mouth lies inside the rim, the wall falls from the lip to the foot, the foot fits the budget', () => {
  assert.ok(geo.MOUTH.rx < geo.RIM.rx && geo.MOUTH.ry < geo.RIM.ry, 'the mouth is inside the rim');
  for (const x of [-300, -100, 0, 100, 300]) {
    assert.ok(geo.mouthFront(x) <= geo.rimFront(x) + 0.5, 'the rim is a ring: its outer front edge lies below the mouth\'s');
    assert.ok(geo.lipBottom(x) === geo.rimFront(x) + geo.LIP);
    assert.ok(geo.baseBottom(Math.min(Math.abs(x), geo.BASE.rx)) > geo.lipBottom(x) - 0.1 || Math.abs(x) > geo.BASE.rx, `the wall has height at ${x}`);
  }
  assert.ok(geo.footBottom(0) <= 170, `the foot ends at ${geo.footBottom(0)}`);
  assert.ok(geo.RIM.rx <= 340, 'the rim is narrower than the hands spread: the figure is wider than its bowl');
  assert.ok(geo.rimFront(0) > geo.rimFront(geo.RIM.rx * 0.9) + 20, 'the front rim sags down in the middle and rises toward both ends');
  assert.ok(geo.profile(geo.WALL_TOP) > geo.profile(100) && geo.profile(100) > geo.profile(geo.BASE.y), 'the wall curves in below the lip to a smaller base');
  assert.ok(Math.abs(geo.profile(geo.BASE.y) - geo.BASE.rx) < 0.5 && geo.BASE.rx < geo.RIM.rx / 1.8, 'a rounded bowl, not a trapezoid: the base is under half the rim');
  assert.equal(RESTS.length, 4, 'four cigarette rests');
  assert.ok(RESTS.every((x) => Math.abs(x) < geo.RIM.rx), 'on the rim');
  const tray = part('tray');
  assert.ok(Math.abs(tray.dx) < 1 && tray.dy - tray.h / 2 < geo.rimFront(0) && tray.dy + tray.h / 2 > geo.lipBottom(0), 'the tray covers the rim and the lip at the middle');
  for (const x of RESTS) assert.ok(Math.abs(x) > tray.w / 2 + 20, 'no rest lies under the tray');
});

test('painting twice makes the same picture: nothing uses chance or the clock', () => {
  const once = (id) => {
    const b = recorder();
    const l = recorder();
    painter(id)(b.ctx, l.ctx, part(id), S);
    return [b.calls.length, l.calls.length];
  };
  for (const id of ids) assert.deepEqual(once(id), once(id), id);
  const names = readdirSync(new URL('../../src/ui/bosses/', import.meta.url)).filter((n) => /^craving-(hull|throne|crown|maw|eye|claw|tray|rage|pkit|pcig)/.test(n) || n === 'craving.js');
  assert.ok(names.length >= 20, `${names.length} files`);
  for (const n of names) {
    const src = readFileSync(new URL(n, new URL('../../src/ui/bosses/', import.meta.url)), 'utf8').replace(/\/\/.*$/gm, '');
    assert.ok(!/Math\.random|Date\.now|performance\.now|shadowBlur/.test(src), `${n} uses chance, the clock or shadowBlur`);
    assert.ok(readFileSync(new URL(n, new URL('../../src/ui/bosses/', import.meta.url)), 'utf8').startsWith('//'), `${n} starts with its comment`);
    if (n !== 'craving.js') assert.ok(!/cached\(\s*['"`]/.test(src) || /cached\(\s*['"`]cravp/.test(src), `${n}: sprite keys are prefixed cravp`);
  }
});
