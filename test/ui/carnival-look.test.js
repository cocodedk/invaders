import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// Ember Carnival's look under stand-in canvases: what its layers light and mark, how its ambient behaves, and
// that an enemy bullet reads on every colour of its sky (looks.test.js has the other worlds'; the live
// flourishes are in carnival-flourish.test.js).
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawAmbient } = await import('../../src/ui/ambient.js');
const { HUES } = await import('../../src/ui/flourish-carnival-sprites.js');

const look = LOOKS[13];
const layers = buildLayers(look, 5);
const [far, mid, near] = layers;

const images = (calls) => calls.filter(([k]) => k === 'drawImage');

test('the far shore carries a coaster whose path climbs, loops and runs on, a drop tower and tents, all lit', () => {
  assert.equal(look.world, 14);
  assert.equal(look.layers.length, 3);
  const track = far.signs.find((s) => s.coaster);
  assert.ok(track.pts.length > 150 && track.len > 1700 && track.len < 2800, `${track.pts.length} points, ${Math.round(track.len)} px of track`);
  assert.ok(Math.min(...track.pts.map((p) => p[1])) < 100, 'a lift hill that stands well above the shore');
  assert.ok(track.pts.some((p, i) => i && p[0] < track.pts[i - 1][0] - 1), 'a loop: the track runs back on itself');
  assert.ok(far.lights.filter((l) => l.mode === 'blink').length >= 25, 'bulbs chase along the track, the tower and the shore');
  assert.ok(far.lights.some((l) => l.mode === 'pulse' && l.r >= 50), "the drop tower's beacon breathes");
  assert.ok(far.lights.filter((l) => l.mode === 'flicker').length >= 4, 'the lake flickers under the lights of the shore');
  assert.ok(far.signs.filter((s) => s.flag).length >= 3, 'pennants on the tents');
});

test('the mid layer has the Ferris wheel marked for its turning, big tops with pennants and bulbs chasing, a lit doorway each', () => {
  const wheels = mid.signs.filter((s) => s.wheel);
  assert.equal(wheels.length, 1);
  assert.ok(wheels[0].r === 170 && wheels[0].n === 16, 'sixteen gondolas on a 170 px wheel');
  assert.ok(mid.signs.filter((s) => s.flag).length >= 8, 'pennants on the pole of every big top and the tower');
  assert.ok(mid.lights.filter((l) => l.mode === 'blink').length >= 30, 'bulbs along the eaves and the platform');
  assert.ok(mid.lights.filter((l) => l.mode === 'steady' && l.r >= 60).length >= 4, 'a lit doorway for every big top');
  assert.equal(far.signs.filter((s) => s.wheel).length + near.signs.filter((s) => s.wheel).length, 0);
});

test('the near layer marks its strings of bulbs and its balloons, lights its lamp posts and its stalls', () => {
  const strings = near.signs.filter((s) => s.string);
  assert.ok(strings.length >= 10 && strings.every((s) => s.n >= 4 && s.x1 > s.x0 + 100 && s.sag > 10), `${strings.length} strings`);
  assert.ok(near.signs.filter((s) => s.balloon).length >= 3, 'balloons tied to the awnings');
  assert.ok(near.lights.filter((l) => l.mode === 'steady' && l.r >= 100).length >= 4, 'a globe on every lamp post');
  assert.ok(near.lights.filter((l) => l.mode === 'pulse').length >= 4, 'a star burning in every marquee');
  assert.ok(near.lights.filter((l) => l.mode === 'blink').length >= 24, 'marquee bulbs, chasing');
  for (const l of layers.flatMap((x) => x.lights)) assert.ok(l.r > 0 && l.color && l.mode && Number.isFinite(l.x + l.y), 'a light has a place, a size, a colour and a mode');
});

test("confetti and lanterns drift across the field, one image for each scrap and lantern and one halo more for each lantern; the lanterns fade at the frame's edges", () => {
  const { ctx, calls } = recorder();
  for (const phase of ['sky', 'mid', 'front']) drawAmbient(ctx, look, phase, { t: 7, drift: 40, wind: 0, world: {} });
  const n = (kind) => look.ambient.filter((a) => a.kind === kind).reduce((s, a) => s + a.n, 0);
  assert.ok(images(calls).length >= n('confetti') + 2 * n('lanterns') + n('embers') + n('wisps') + n('twinkle'), 'every entry draws');
  const faint = [];
  for (let t = 0; t < 120; t += 0.7) {
    const r = recorder();
    drawAmbient(r.ctx, { ...look, ambient: look.ambient.filter((a) => a.kind === 'lanterns') }, 'sky', { t, drift: 0, wind: 0, world: {} });
    r.calls.filter(([k]) => k === 'drawImage').forEach((c) => faint.push(c.alpha));
  }
  assert.ok(faint.some((a) => a < 0.1), 'some are at the edge, faint');
  assert.ok(faint.some((a) => a >= 0.4), 'and some are in full glow');
});

// WCAG contrast ratio between two hex colours.
function contrast(a, b) {
  const lum = (h) => rgb(h).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

test("an enemy bullet reads on every colour of the night: its white core on the dark sky and its dark rim on the bright, and its lime is nobody else's", () => {
  const { enemy, enemyRim } = look.palette;
  const skies = [...look.sky.map(([, c]) => c), '#e8649c', '#ffc86a', ...HUES, '#fff4d8']; // the sky, the fair's glow at the horizon, the bursts' light
  for (const sky of skies) {
    const best = Math.max(contrast('#ffffff', sky), contrast(enemyRim, sky));
    assert.ok(best >= 3, `${sky}: core ${contrast('#ffffff', sky).toFixed(1)}, rim ${contrast(enemyRim, sky).toFixed(1)}`);
  }
  assert.ok(contrast(enemy, enemyRim) >= 3.5, `the ring stands out from its rim, ${contrast(enemy, enemyRim).toFixed(1)}`);
  assert.ok(skies.filter((s) => contrast(enemy, s) >= 2.2).length >= 5, 'and the ring itself is plain against most of the sky');
  for (const c of [...HUES, ...Object.values(look.palette.alien)]) assert.ok(dist(enemy, c) >= 60, `${c} is too near the enemy's lime (${dist(enemy, c).toFixed(0)})`);
});

test("the player's shot is not the enemy's colour, and the boss's weak points share the laser's cool accent", () => {
  const { shot, enemy, beam, boss } = look.palette;
  assert.ok(dist(shot, enemy) >= 100, `a cream shot against a lime orb: ${dist(shot, enemy).toFixed(0)}`);
  assert.equal(boss.weak, beam);
  assert.ok(contrast(beam, look.sky[0][1]) > 6, 'bright against the dark sky overhead');
  assert.ok(contrast(look.palette.accent, look.sky[0][1]) > 6, "and so is the ship's accent");
});
