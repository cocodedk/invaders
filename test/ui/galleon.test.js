import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';

// The Thunder Galleon's art under stand-in canvases: what each part puts on the lights layer, where the art
// lies against the boss's box (and the HUD above it), the live extras, which are cached sprites only (the
// opaque ones only in the boss's own pass), and that warming leaves nothing to bake mid-fight.
installCanvas(64);
let made = 0;
const create = document.createElement;
document.createElement = (...a) => (made++, create(...a));
const { BOSS_DEFS } = await import('../../src/core/bosses-data.js');
const { BOSS_ART, painterFor, warmBoss } = await import('../../src/ui/bosses/bake.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { flame, pennant, blades, captain, wheel, needle } = await import('../../src/ui/bosses/galleon-sprites.js');
const { furled } = await import('../../src/ui/bosses/galleon-furl.js');
const { star, glow } = await import('../../src/ui/sprites.js');

const look = LOOKS[12];
const def = BOSS_DEFS.find((d) => d.kind === 'galleon');
const art = BOSS_ART.galleon;
const S = { def, pal: look.palette.boss, look, W: def.size.w + 120, H: def.size.h + 120, pad: 60 };
const lit = (calls) => calls.filter(([k]) => ['fill', 'fillRect', 'stroke', 'drawImage'].includes(k)).length;
const HUD = -164; // the boss rests at 260 and the HUD ends at 96: this is the highest anything may reach, in boss coordinates
const PAD = def.size.w / 2 + 60;
const f = (n) => Math.round(n);

// A boss to draw live extras for: parts at their places, every one alive, in `phase`.
const boss = (phase) => ({ x: 0, y: 0, phase, parts: def.parts.map((p) => ({ ...p, x: p.dx, y: p.dy })) });
const without = (b, ...ids) => ({ ...b, parts: b.parts.map((p) => (ids.includes(p.id) ? { ...p, hp: 0 } : p)) });
// One live pass: every drawImage, from a context standing, as the game's does, in 'lighter'.
function pass(b, t, own = false, since = 0) {
  const T = tracker();
  T.ctx.globalCompositeOperation = 'lighter';
  art.live(T.ctx, b, t, 1, own, since);
  return { ...T, after: T.ctx.globalCompositeOperation };
}
const count = (calls, img) => calls.filter((c) => c.img === img).length;
const sweepT = (b, own, fn) => { for (let t = 3; t < 40; t += 0.29) fn(pass(b, t, own, 0), t); };

// First, while the shared sprite caches are empty: whatever the live extras need that warming missed would
// be made during the fight.
test('warming paints everything the live extras draw: nothing is baked mid-fight', () => {
  warmBoss(look, 'galleon');
  const before = made;
  for (const phase of [0, 1, 2]) for (const own of [false, true]) sweepT(boss(phase), own, () => {});
  pass(boss(1), 10.4, true, 10);
  assert.equal(made - before, 0, 'no canvas was made during the fight');
});

test('the galleon is drawn once as its left pod and gun deck, mirrored for the right; one rage layer per phase', () => {
  for (const base of ['prop', 'gun']) {
    assert.deepEqual(painterFor(art, `${base}L`), [art.parts[base], 1]);
    assert.deepEqual(painterFor(art, `${base}R`), [art.parts[base], -1]);
  }
  for (const id of ['mast', 'bridge', 'keel']) assert.equal(painterFor(art, id)[1], 1, `${id} is drawn as it is`);
  assert.equal(art.rage.length, 3);
  assert.equal(art.rage[0], null, 'the first phase is the ship under full sail');
  assert.equal(typeof art.live, 'function', 'the sails, props and fire are live extras');
  assert.equal(typeof art.warm, 'function', 'whose sprites are baked ahead of the fight');
  assert.equal(art.crack, '#ffb54a');
});

test('the hull, every part and the later phases paint lights: windows, aether, fire, lamps', () => {
  const hull = recorder();
  art.hull(recorder().ctx, hull.ctx, S);
  assert.ok(lit(hull.calls) >= 15, `the hull lights: ${lit(hull.calls)}`);
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
    assert.ok(lit(l.calls) >= phase + 1, `phase ${phase} glows round the furnace`);
  }
});

test('the whole boss bakes, damage states and all, with a rage layer for the second and third phases', () => {
  const B = warmBoss(look, 'galleon');
  for (const p of def.parts) assert.ok(B.parts[p.id], `${p.id} is baked`);
  assert.deepEqual(B.hull.rage.map((r) => r !== null), [false, true, true]);
});

test('nothing opaque on the hull or a part rises into the HUD, and every part stays on its canvas', () => {
  const hull = tracker();
  art.hull(hull.ctx, recorder().ctx, S);
  assert.ok(hull.bounds.y0 - 2.5 >= HUD, `the hull's highest point: ${f(hull.bounds.y0)}`);
  assert.ok(hull.bounds.y1 <= def.size.h / 2 + 60 && Math.abs(hull.bounds.x0) <= PAD, 'and it lies inside the box and its pad');
  for (const p of def.parts) {
    const b = tracker();
    painterFor(art, p.id)[0](b.ctx, recorder().ctx, p, S);
    assert.ok(p.dy + b.bounds.y0 - 2.5 >= HUD, `${p.id}'s highest point: ${f(p.dy + b.bounds.y0)}`);
    const m = art.margins?.[p.id] ?? art.margin ?? 34;
    assert.ok(-b.bounds.x0 <= p.w / 2 + m && b.bounds.x1 <= p.w / 2 + m, `${p.id} is within its canvas side to side`);
    assert.ok(-b.bounds.y0 <= p.h / 2 + m && b.bounds.y1 <= p.h / 2 + m, `${p.id} is within its canvas top to bottom`);
  }
  art.rage.forEach((paint, i) => {
    if (!paint) return;
    const l = tracker();
    paint(l.ctx, S);
    assert.ok(l.bounds.y1 <= S.H / 2 && l.bounds.y0 >= -S.H / 2 && Math.abs(l.bounds.x0) <= S.W / 2, `phase ${i}'s glow ends inside the hull's canvas, so it is not cut off`);
  });
});

test('live extras stay under the HUD and inside the box and its pad, in every phase and pass', () => {
  for (const phase of [0, 1, 2]) {
    for (const own of [false, true]) {
      sweepT(boss(phase), own, ({ bounds }) => {
        assert.ok(bounds.y0 >= HUD, `phase ${phase} own ${own}: top ${f(bounds.y0)}`);
        assert.ok(bounds.y1 <= def.size.h / 2 + 60 && Math.abs(bounds.x0) <= PAD && bounds.x1 <= PAD, `phase ${phase} own ${own}: ${f(bounds.x0)}..${f(bounds.x1)}, bottom ${f(bounds.y1)}`);
      });
    }
  }
});

test('everything opaque is drawn only in the own pass, which leaves the context additive as it found it', () => {
  for (const phase of [0, 1, 2]) {
    const lights = pass(boss(phase), 14, false);
    assert.ok(lights.calls.every((c) => c.comp === 'lighter'), `phase ${phase}: the darkness pass draws only additive light`);
    const own = pass(boss(phase), 14, true);
    assert.ok(own.calls.some((c) => c.comp === 'source-over'), `phase ${phase}: the own pass draws the blades, flags and lanterns`);
    assert.equal(own.after, 'lighter');
    assert.equal(lights.after, 'lighter');
    const glints = own.calls.filter((c) => [glow('#ffcf6a'), star('#fff0c0'), glow('#ff8a2a')].includes(c.img));
    assert.ok(glints.length > 10 && glints.every((c) => c.comp === 'lighter'), `phase ${phase}: the own pass adds its lamps, glints and furnace light back as light`);
  }
});

test('the sails fill and ripple in strips, are drawn up to the yard when the second phase begins, and stay reefed after', () => {
  const strips = (phase, t, since) => pass(boss(phase), t, true, since).calls.filter((c) => c.args.length === 8).length;
  assert.equal(strips(0, 14, 0), 36, 'four sails of nine strips');
  assert.equal(strips(1, 10.5, 10), 36, 'half a second into the second phase they are still being drawn up');
  assert.equal(strips(1, 14, 10), 0, 'then they are reefed, as the hull has them baked');
  assert.equal(strips(2, 14, 10), 0);
  assert.deepEqual([furled(0, 5, 0), furled(1, 10, 10), furled(1, 30, 10), furled(2, 30, 10)], [0, 0, 1, 1]);
  assert.ok(furled(1, 10.7, 10) > 0 && furled(1, 10.7, 10) < 1);
});

test('the blades turn, the flags fly, the lanterns swing and the captain paces, until the part they hang on is gone', () => {
  const own = (b) => pass(b, 14, true).calls;
  const [all, noProp, noMast, noBridge] = [boss(0), without(boss(0), 'propL'), without(boss(0), 'mast'), without(boss(0), 'bridge')].map(own);
  const flags = (calls) => [0, 1, 2, 3, 4, 5, 6, 7].reduce((n, k) => n + count(calls, pennant(k)), 0);
  assert.equal(count(all, blades()), 4, 'two blades each, one a ghost of the other');
  assert.equal(count(noProp, blades()), 2, 'a shot-off pod has no blades');
  assert.equal(flags(all), 5, 'the mast and four yardarms fly pennants');
  assert.equal(flags(noMast), 4);
  assert.equal(count(all, captain()), 1);
  assert.equal(count(noBridge, captain()), 0);
  assert.equal(count(all, wheel()), 1, 'the wheel turns in the next window');
  assert.equal(count(noBridge, wheel()), 0);
  assert.equal(count(all, needle()), 1, 'the gauge needle trembles in the keel');
  assert.equal(count(own(without(boss(0), 'keel')), needle()), 0);
  assert.ok(all.length - noMast.length >= 3, 'the mast takes its pennant and its lantern with it');
});

test('the furnace is banked in the first phase, roaring in the second, five tongues in the third; the broadside fires only then', () => {
  const tongues = (phase, b = boss(phase)) => [0, 1, 2, 3].reduce((n, k) => n + count(pass(b, 14, true).calls, flame(k)), 0);
  assert.deepEqual([0, 1, 2].map((p) => tongues(p)), [1, 3, 5]);
  assert.equal(tongues(2, without(boss(2), 'keel')), 0, 'a destroyed keel puts its fire out');
  const flashes = (phase, b = boss(phase)) => {
    let n = 0;
    sweepT(b, false, ({ calls }) => { n += count(calls, star('#ffd070')); });
    return n;
  };
  assert.equal(flashes(0), 0);
  assert.equal(flashes(1), 0);
  assert.ok(flashes(2) > 20, 'muzzle flashes along both decks');
  assert.equal(flashes(2, without(boss(2), 'gunL', 'gunR')), 0, 'and none from a deck that is gone');
});

test('a destroyed part leaves no glow behind in the live extras', () => {
  for (const id of ['mast', 'bridge', 'propL', 'gunL', 'keel']) {
    for (const phase of [0, 2]) {
      assert.ok(pass(without(boss(phase), id), 14, true).calls.length < pass(boss(phase), 14, true).calls.length, `${id} in phase ${phase}`);
      assert.ok(pass(without(boss(phase), id), 14).calls.length < pass(boss(phase), 14).calls.length, `${id}'s lights in phase ${phase}`);
    }
  }
});
