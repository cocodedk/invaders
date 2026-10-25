import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { look, def, art, S, HUD, f } from './moth-kit.js';
import { tracker } from './galleon-track.js';

// The Vesper Moth's parts one by one: the colours are the boss palette's and the jewel colours of the glass, and none
// is the enemy's acid lime; the heart is a rose window of eight petals, the eyespot a bullseye of rings of glass, the
// abdomen five bands with a slit of light between each pair, the antennae a pair of feathers that curl and stay under
// the HUD, the hindwing a rose window round the eyespot; and what the live pass shares with them (the light's frames).
const kit = await import('../../src/ui/bosses/moth-kit.js');
const { HEART } = await import('../../src/ui/bosses/moth-heart.js');
const { SPOT } = await import('../../src/ui/bosses/moth-spot.js');
const tail = await import('../../src/ui/bosses/moth-tail.js');
const { antenna, at, SHAFT } = await import('../../src/ui/bosses/moth-antenna.js');
const { roseFrame, spinFrame, slitGlow, ROSE_FRAMES, SPIN_FRAMES, RS, SS, SL } = await import('../../src/ui/bosses/moth-light.js');
const { EYES } = await import('../../src/ui/bosses/moth-crown.js');

test("the palette's three colours are the boss's own, and the glass is the five jewel colours", () => {
  assert.equal(kit.STONE, look.palette.boss.hull, 'deep indigo stone');
  assert.equal(kit.STONE_L, look.palette.boss.plate, 'violet-grey stone lit by the dawn');
  assert.equal(kit.WEAK, look.palette.boss.weak, 'hot white-gold: the weak points');
  assert.deepEqual([kit.ROSE, kit.COBALT, kit.AMBER, kit.VIOLET, kit.GOLD], ['#ff5fa2', '#4fa8ff', '#ffb04a', '#a47cff', '#ffe27a']);
  assert.deepEqual(kit.JEWELS, [kit.ROSE, kit.COBALT, kit.AMBER, kit.VIOLET, kit.GOLD]);
});

test('no colour in the moth is a bright lime: that green is the enemy\'s bullet alone, and any green is dark and small', () => {
  const dir = new URL('../../src/ui/bosses/', import.meta.url);
  const hue = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [mx, mn] = [Math.max(r, g, b), Math.min(r, g, b)];
    if (mx === mn) return [0, 0, mx];
    const d = mx - mn;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, d / mx, mx];
  };
  let seen = 0;
  for (const name of readdirSync(dir).filter((n) => /^moth(-.*)?\.js$/.test(n))) {
    for (const [hex] of readFileSync(new URL(name, dir), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      seen++;
      const [h, s, v] = hue(hex);
      assert.ok(!(h > 60 && h < 150 && s > 0.45 && v > 0.55), `${name}: ${hex} is a bright green`);
    }
  }
  assert.ok(seen > 100, `${seen} colours looked at`);
  assert.ok(hue(kit.GREEN)[2] < 0.5, 'the one green is dark');
});

test('the heart is a rose window of eight lancet petals in a gilt ring, the eyespot rings of glass round a lens', () => {
  assert.equal(HEART.petals, 8);
  assert.ok(HEART.r0 < HEART.rs && HEART.rs < HEART.rt && HEART.R > HEART.rt + 5, 'petals run from the hub to their points inside the ring');
  const heart = def.parts.find((p) => p.id === 'heart');
  assert.ok(HEART.R * 2 <= heart.h, 'the ring fits the heart\'s box');
  const spot = def.parts.find((p) => p.id === 'spotL');
  assert.ok(SPOT.rx * 2 <= spot.w && SPOT.ry * 2 <= spot.h, 'the eyespot fits its box');
  assert.ok(SPOT.ring < SPOT.rx, 'its glass lies inside a ring of stone');
});

test('the abdomen is five bands with a slit of light between each pair, tapering to a tip, its rings bowed like a tube', () => {
  assert.equal(tail.BANDS, 5);
  assert.equal(tail.SLITS.length, 4);
  const box = def.parts.find((p) => p.id === 'tail');
  assert.ok(tail.SLITS.every((y, i) => y > -box.h / 2 && y < box.h / 2 && (i === 0 || y > tail.SLITS[i - 1])), 'in the box, top to bottom');
  const hws = [-46, -30, 0, 20, 40].map(tail.halfWidth);
  assert.ok(hws[0] < hws[1] && hws.slice(1).every((w, i) => i === 0 || w < hws[i]), 'widest near the top, then narrowing');
  assert.ok(tail.halfWidth(46) < 8, 'to a point');
  const ring = tail.ring(0, 16);
  assert.ok(ring[8][1] > ring[0][1] + 4, 'a ring bows down at the middle');
  assert.ok(Math.abs(ring[0][0] + ring[16][0]) < 1e-9, 'symmetrically');
  assert.ok(tail.ring(0, 16, 4)[1][1] !== tail.ring(0, 16)[1][1], 'a band\'s lower edge is cut in cusps');
});

test('the antennae are bipectinate feathers: they rise from the crown, arch out like a lyre, curl down, and stay under the HUD with their barbs', () => {
  const crown = def.parts.find((p) => p.id === 'crown');
  const out = [0, 0, 0, 0];
  assert.equal(at(0.5, out), out, 'at() writes into the scratch it is given: nothing allocated per frame');
  let [top, right] = [0, 0];
  for (let u = 0; u <= 1; u += 0.01) {
    const [x, y, tx, ty] = at(u);
    assert.ok(Math.abs(Math.hypot(tx, ty) - 1) < 1e-9, 'the direction is a unit vector');
    top = Math.min(top, y);
    right = Math.max(right, x);
  }
  assert.ok(top < SHAFT[0][1] - 10 && at(1)[1] > top + 30, `it rises (to ${f(top)}) and curls down (to ${f(at(1)[1])})`);
  assert.ok(right >= 98 && right <= 112, 'and reaches well out over the shoulder, no further than the crown\'s margin');
  const b = tracker();
  antenna(b.ctx);
  assert.ok(crown.dy + b.bounds.y0 - 2.5 >= HUD, `barbs and all: ${f(crown.dy + b.bounds.y0)}`);
  assert.ok(b.bounds.x1 <= crown.w / 2 + 34, 'and within the canvas');
  assert.equal(EYES.length, 2);
  assert.ok(EYES.every(([x, y, r]) => Math.abs(x) + r < crown.w / 2 && y + r < crown.h / 2), 'the eyes lie in the crown\'s box');
});

test('the light the live pass draws is cached: a loop of frames for the rose window and the rings, a glow for each slit', () => {
  const rose = Array.from({ length: ROSE_FRAMES }, (_, i) => roseFrame(i));
  const spin = Array.from({ length: SPIN_FRAMES }, (_, i) => spinFrame(i));
  assert.equal(new Set(rose).size, ROSE_FRAMES);
  assert.equal(new Set(spin).size, SPIN_FRAMES);
  assert.equal(roseFrame(3), rose[3], 'kept');
  for (const c of rose) assert.deepEqual([c.width, c.height], [RS, RS]);
  for (const c of spin) assert.deepEqual([c.width, c.height], [SS.w, SS.h]);
  for (let i = 0; i < tail.SLITS.length; i++) assert.deepEqual([slitGlow(i).width, slitGlow(i).height], [SL.w, SL.h]);
  const heart = def.parts.find((p) => p.id === 'heart');
  assert.ok(HEART.R * 2 + 2 <= RS && RS / 2 <= heart.h / 2 + 34, 'the rose sprite stays in the heart\'s canvas');
  assert.equal(ROSE_FRAMES, 8, 'one frame for each eighth of a turn: the window looks the same after a petal');
  assert.ok(S.W > 0);
});

test('the files are named for what they hold', () => {
  const names = readdirSync(new URL('../../src/ui/bosses/', import.meta.url)).filter((n) => /^moth(-.*)?\.js$/.test(n));
  for (const n of ['moth.js', 'moth-kit.js', 'moth-hull.js', 'moth-hind.js', 'moth-thorax.js', 'moth-fur.js', 'moth-wing.js', 'moth-wing-geo.js', 'moth-frames.js', 'moth-crown.js', 'moth-antenna.js', 'moth-heart.js', 'moth-rose.js', 'moth-spot.js', 'moth-tail.js', 'moth-rage.js', 'moth-fx.js', 'moth-wing-live.js', 'moth-light.js', 'moth-motion.js', 'moth-scales.js']) {
    assert.ok(names.includes(n), `${n} exists`);
  }
  assert.equal(art.pad, 60);
});
