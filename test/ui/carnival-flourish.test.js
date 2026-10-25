import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas, recorder } from './dom-kit.js';
import { glow } from '../../src/ui/sprites.js';

// Ember Carnival's live flourishes under stand-in canvases: the firework shows (a rocket climbs, a burst spreads
// and falls, the lake reflects it), the searchlights, the coaster's train, the wheel, the strings of bulbs and the
// balloons (carnival-look.test.js has what the layers mark and the ambient).
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { drawFlourishes } = await import('../../src/ui/flourish.js');
const { show, LANE_COUNT, RISE, LIFE } = await import('../../src/ui/flourish-10.js');
const { HUES, KINDS } = await import('../../src/ui/flourish-carnival-sprites.js');

const look = LOOKS[13];
const layers = buildLayers(look, 5);
const [far, mid, near] = layers;

function env(t, ship = null, only = look.flourish) {
  return { v: { look: { ...look, flourish: only }, layers, cache: {} }, world: { level: {}, ship }, fx: { flashes: [], time: t }, t, quality: 1 };
}
const draw = (phase, t, only, x0 = -160, top = 0, ship = null) => {
  const { ctx, calls } = recorder();
  drawFlourishes(ctx, env(t, ship, only), phase, x0, top);
  return calls;
};
const images = (calls) => calls.filter(([k]) => k === 'drawImage');

test('four launchers fire on a rota of their own: a rocket climbs, bursts into one of three shapes in one of five colours, and the sky is seldom dark', () => {
  let bursting = 0;
  let any = 0;
  const seen = new Set();
  for (let t = 0; t < 400; t += 0.1) {
    let some = false;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const s = show(lane, t);
      if (!s) continue;
      assert.deepEqual(s, show(lane, t), 'the same shot at the same time');
      assert.ok(s.age >= -RISE - 1e-9 && s.age <= LIFE + 1e-9 && s.rise >= 0 && s.rise <= 1);
      assert.ok(HUES.includes(s.hue) && KINDS.includes(s.kind), 'a colour and a shape of the show');
      assert.ok(s.x > 100 && s.x < 1820 && s.y > 100 && s.y < 360 && s.size >= 0.6 && s.size <= 0.95, `burst at ${s.x | 0},${s.y | 0}`);
      assert.ok(s.x0 > 100 && s.x0 < 1820, 'lifted off from the shore below');
      seen.add(`${s.kind}${s.hue}`);
      if (s.age >= 0) some = true;
    }
    if (some) bursting++;
    any++;
  }
  assert.ok(bursting / any > 0.75 && bursting / any < 0.999, `${bursting} of ${any} frames have a burst up`);
  assert.ok(seen.size >= 10, `${seen.size} of the 15 shape-and-colour pairs seen in 400 s`);
});

test('a burst is a white flash first, then the sprite spreads and its sparks fall; between shots the sky shows none of it', () => {
  const lane = 0;
  let t0 = 0;
  while (!(show(lane, t0) && Math.abs(show(lane, t0).age) < 0.01)) t0 += 0.005; // the moment lane 0 bursts
  const only = ['fireworks'];
  const flash = images(draw('sky', t0 + 0.05, only)).filter((c) => c[1] === glow('#ffffff') && c[4] >= 228); // the white flash is a square of 380 * size
  assert.equal(flash.length, 1, 'a flash at the burst');
  assert.equal(images(draw('sky', t0 + 0.4, only)).filter((c) => c[1] === glow('#ffffff') && c[4] >= 228).length, 0, 'gone within a fifth of a second');
  const early = images(draw('sky', t0 + 0.06, only)).length;
  const late = images(draw('sky', t0 + 0.9, only));
  assert.ok(early >= 12 && late.length >= 8, `${early} images in the first moments and ${late.length} a second later`);
  assert.ok(late.every((c) => c.alpha <= 1 && c.alpha >= 0), 'all in range');
  let dark = null;
  for (let t = 0; t < 300 && dark === null; t += 0.05) if (Array.from({ length: LANE_COUNT }, (_, l) => show(l, t)).every((s) => !s || s.age < 0)) dark = t;
  assert.notEqual(dark, null, 'a moment with nothing in bloom');
  assert.equal(images(draw('sky', dark, only)).length, 0, 'and then nothing is drawn');
  assert.deepEqual(draw('sky', 9.37, only), draw('sky', 9.37, only), 'the same frame twice');
});

test('rockets are drawn only while they climb, a bright head with a tail of sparks, and rise from one frame to the next', () => {
  let t0 = 0;
  while (!(show(0, t0) && show(0, t0).age < -0.5)) t0 += 0.01;
  const head = (t) => images(draw('sky', t, ['rockets'])).findLast((c) => c[1] === glow('#ffffff') && c[4] === 18);
  const [a, b] = [head(t0), head(t0 + 0.2)];
  assert.ok(a && b && b[3] < a[3], 'the rocket climbs');
  assert.ok(images(draw('sky', t0 + 0.3, ['rockets'])).length >= 17, 'a head and a long tail');
  let still = null;
  for (let t = 0; t < 300 && still === null; t += 0.05) if (Array.from({ length: LANE_COUNT }, (_, l) => show(l, t)).every((q) => !q || q.age >= 0)) still = t;
  assert.notEqual(still, null, 'a moment with no rocket on the climb');
  assert.equal(images(draw('sky', still, ['rockets'])).length, 0, 'and then none is drawn');
});

test('the searchlights turn slowly over the smoke and leave the context as they found it', () => {
  const beams = (t) => draw('sky', t, ['sweep']).filter(([k]) => k === 'rotate').map((c) => c[1].toFixed(3)).join();
  assert.equal(draw('sky', 3, ['sweep']).filter(([k]) => k === 'rotate').length, 2);
  assert.notEqual(beams(3), beams(6));
  const { ctx } = recorder();
  ctx.globalAlpha = 0.6;
  drawFlourishes(ctx, env(3, null, ['sweep']), 'sky');
  assert.equal(ctx.globalAlpha, 1);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
});

test('the burst is reflected in the lake only while it burns', () => {
  const refl = (t) => images(draw('far', t, ['fireworks'], -160, 380)).length;
  let busiest = 0;
  let dark = Infinity;
  for (let t = 0; t < 120; t += 0.1) {
    const n = refl(t);
    busiest = Math.max(busiest, n);
    dark = Math.min(dark, n);
  }
  assert.ok(busiest >= 10, `${busiest} streaks and pools at the busiest`);
  assert.equal(dark, 0, 'and none when no burst is up');
});

test('a train of three cars runs the coaster, turned to follow the track, fading in and out, and rests at the station between laps', () => {
  const track = far.signs.find((s) => s.coaster);
  const cars = (t) => draw('far', t, ['coaster'], -160, 380).filter(([k]) => k === 'rotate');
  assert.equal(cars(2.5).length, 3, 'three cars on the way');
  assert.notEqual(cars(2.5).map((c) => c[1].toFixed(3)).join(), cars(3.5).map((c) => c[1].toFixed(3)).join(), 'they turn with the track');
  const x = (t) => draw('far', t, ['coaster'], -160, 380).find(([k]) => k === 'translate')[1];
  assert.ok(x(3) > x(2), 'and advance');
  const rest = (track.len + 200) / 260; // seconds into a lap when every car has gone past the end
  assert.equal(cars(rest).length, 0, 'at the station nothing is drawn');
  const loops = new Set();
  for (let t = 0; t < 20; t += 0.1) draw('far', t, ['coaster'], -160, 380).filter(([k]) => k === 'rotate').forEach((c) => loops.add(Math.abs(c[1]) > Math.PI / 2));
  assert.ok(loops.has(true) && loops.has(false), 'a car runs upside down round the loop');
});

test('the wheel turns with sixteen gondolas hanging from their pins and a run of bulbs chasing round it', () => {
  const calls = draw('mid', 4, ['wheel'], -160, 620);
  assert.equal(calls.filter(([k]) => k === 'rotate').length, 1 + 16, 'the rim, and a turn of sway for each gondola');
  assert.ok(images(calls).length >= 1 + 16 + 32 + 16 + 1, `${images(calls).length} images: rim, gondolas, bulbs, spokes' bulbs, hub`);
  const bright = (t) => images(draw('mid', t, ['wheel'], -160, 620)).slice(17, 49).map((c) => c.alpha.toFixed(2)).join();
  assert.notEqual(bright(4), bright(4.1), 'the chase moves');
  const { ctx } = recorder();
  drawFlourishes(ctx, env(4, null, ['wheel']), 'mid', -160, 620);
  assert.equal(ctx.globalCompositeOperation, 'source-over');
  assert.equal(ctx.globalAlpha, 1);
});

test('the strings of bulbs and the balloons sway on the air, the bulbs lit in waves and the balloons leaning', () => {
  const all = near.signs.filter((s) => s.string);
  const lamps = (t, shipX = 960) => images(draw('near', t, ['strings'], -160, 0, { x: shipX })).length;
  assert.equal(lamps(3), all.reduce((n, s) => n + s.n, 0), 'a bulb for every one the layer marks, all in view');
  const shine = (t) => images(draw('near', t, ['strings'], -160, 0, { x: 960 })).map((c) => c.alpha.toFixed(2)).join();
  assert.notEqual(shine(3), shine(3.2), 'the colours run along the strings');
  const pos = (t) => images(draw('near', t, ['strings'], -160, 0, { x: 960 })).map((c) => c[2].toFixed(1) + c[3].toFixed(1)).join();
  assert.notEqual(pos(3), pos(5), 'the strings sway');
  const balloons = (t) => draw('near', t, ['balloons'], -160, 0, { x: 960 });
  assert.ok(images(balloons(2)).length >= 3, 'balloons in view');
  assert.notEqual(balloons(2).filter(([k]) => k === 'translate').map((c) => c[1].toFixed(1)).join(), balloons(5).filter(([k]) => k === 'translate').map((c) => c[1].toFixed(1)).join(), 'swaying on their strings');
  assert.equal(balloons(2).filter(([k]) => k === 'save').length, balloons(2).filter(([k]) => k === 'restore').length, 'every transform is put back');
});
