import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// Lantern Deep's look (looks/w15.js): that it is registered, that every layer kind, ambient kind and flourish it names exists,
// that its colours keep the enemy's bullets the loudest thing in the frame, and that the backdrop stays quiet. The
// pieces have their own tests (deep-sky, deep-reef, deep-flourish, maelstrom, aliens-deep, angler, art-deep, powers-deep).
installCanvas(64);
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { AMBIENT7 } = await import('../../src/ui/ambient-7.js');
const { FLOURISH12, } = await import('../../src/ui/flourish-12.js');
const { FLOURISH13 } = await import('../../src/ui/flourish-13.js');
const { FLOURISH_SWAY } = await import('../../src/ui/flourish-deep-sway.js');
const { FLOURISH_MAELSTROM } = await import('../../src/ui/flourish-maelstrom.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { FRAMES, ICONS } = await import('../../src/ui/pickup-skins.js');
const { BOSS_ART } = await import('../../src/ui/bosses/bake.js');
const { art } = await import('../../src/ui/aliens/bake.js');
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { POWERS_15 } = await import('../../src/core/kinds.js');

const look = LOOKS[14];
const FLOURISHES = { ...FLOURISH12, ...FLOURISH13, ...FLOURISH_SWAY, ...FLOURISH_MAELSTROM };

function contrast(a, b) {
  const lum = (h) => rgb(h).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const hue = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  if (hi === lo) return -1;
  const d = hi - lo;
  const k = hi === r ? ((g - b) / d + 6) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return k * 60;
};

test('world 15 is registered as Lantern Deep and every level of it gets this look', () => {
  assert.equal(LOOKS.length, 17);
  assert.equal(look.world, 15);
  assert.equal(WORLDS[14].name, 'Lantern Deep');
  assert.equal(lookFor(levelById('w15-3')), look);
  assert.equal(look.music.mood, 'abyss');
  assert.equal(look.bunker.skin, 'reef');
});

test('everything the look names is there: sky body, layers, ambient, flourishes, bunker skin, pickup frame, icons, boss and aliens', () => {
  assert.equal(typeof BODIES[look.body], 'function');
  const layers = buildLayers(look, 5);
  assert.deepEqual(layers.map((l) => l.canvas.height), [700, 460, 320]);
  for (const a of look.ambient) assert.equal(typeof AMBIENT7[a.kind], 'function', a.kind);
  for (const name of look.flourish) {
    assert.ok(FLOURISHES[name], name);
    assert.ok(Object.values(FLOURISHES[name]).every((f) => typeof f === 'function'), `${name} draws`);
  }
  assert.equal(typeof SKINS[look.bunker.skin], 'function');
  assert.equal(typeof FRAMES[15], 'function');
  assert.ok(ICONS[15].pearls && ICONS[15].trident);
  assert.ok(BOSS_ART.angler && levelById('w15-5').boss === 'angler');
  for (const role of ['grunt', 'diver', 'gunner', 'armored', 'carrier']) assert.equal(typeof art(look)[role], 'function', role);
  for (const kind of [...POWERS_15, 'bomb', 'life']) assert.ok(look.power[kind], `a tint for ${kind}`);
});

test('an enemy bullet reads on every colour of the water: its dark rim on the light, its core on the dark, and nothing living wears its amber', () => {
  const { enemy, enemyRim, alien, shot, beam, boss } = look.palette;
  for (const [, sky] of look.sky) {
    const best = Math.max(contrast('#ffffff', sky), contrast(enemyRim, sky));
    assert.ok(best >= 3, `${sky}: core ${contrast('#ffffff', sky).toFixed(1)}, rim ${contrast(enemyRim, sky).toFixed(1)}`);
    assert.ok(contrast(enemy, sky) >= 3.5, `the amber ring is plain against ${sky}: ${contrast(enemy, sky).toFixed(1)}`);
  }
  assert.ok(contrast(enemy, enemyRim) >= 5, 'the ring stands out from its rim');
  for (const c of [...Object.values(alien), ...Object.values(boss), shot, beam, look.palette.accent, look.power.pearls, look.power.trident, look.power.life]) {
    assert.ok(dist(enemy, c) >= 60, `${c} is too near the enemy's amber (${dist(enemy, c).toFixed(0)})`);
  }
  assert.ok(dist(shot, enemy) >= 100, "the ship's shot is not the enemy's colour");
  assert.ok(contrast(look.palette.accent, look.sky[0][1]) > 6 && contrast(boss.weak, boss.hull) > 6, 'the ship and the weak points stand out of the dark');
});

test('the backdrop is quiet: nothing in the ambient is amber, no ambient is louder than half strength, and the near layer keeps its lights cool and few at the bottom', () => {
  for (const a of look.ambient) {
    assert.ok(a.alpha <= 0.5, `${a.kind} ${a.phase} alpha ${a.alpha}`);
    for (const c of a.colors) {
      const h = hue(c);
      assert.ok(h === -1 || h < 20 || h > 70 || contrast(c, '#02071a') < 1.2, `${a.kind}: ${c} is amber`); // warm yellow-orange hues (20-70) are the bullets'
      assert.ok(!['#ffd8f0', '#fff0f8'].includes(c), `${a.kind} wears the pearls' white`);
    }
  }
  const near = buildLayers(look, 5)[2];
  const low = near.lights.filter((l) => l.y > 320 * 0.55);
  assert.ok(low.every((l) => l.r <= 30), 'the lights low on the reef (behind the player zone) are small');
  assert.ok(low.every((l) => { const h = hue(l.color); return h > 70 || h < 20; }), 'and cool');
});

test("the world's twist is the gravity well and its powers are the drop list's two extras", () => {
  assert.equal(levelById('w15-1').twist, 'gravity');
  assert.deepEqual(POWERS_15.slice(-2), ['pearls', 'trident']);
});
