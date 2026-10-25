import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, tracker, recorder, stateful, hsl, hexOf, probe, W, H } from './smogenv1-kit.js';

// World 17's two baked skies (sky-bodies-9.js: smogsky and cleansky, with their helpers): the smog's low heavy ceiling with a dull
// coin of a sun, and the clean morning with a bright sun, white cumulus and thin cirrus. They share one sun, upper right of centre and
// clear of the Craving; the middle top of both stays calm; neither holds anything that could pass for a bullet; each leaves the
// context as it found it.
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { SUN, BODIES9 } = await import('../../src/ui/sky-bodies-9.js');
const { COIN_R } = await import('../../src/ui/sky-bodies-9-smog.js');
const { SUN_R, RAYS } = await import('../../src/ui/sky-bodies-9-clean.js');
const { field } = await import('../../src/ui/sky-bodies-9-kit.js');

const BOSS = { x0: 590, x1: 1330, y0: 140, y1: 600 }; // the Craving at rest, orbiting, with its crown: nothing of the sun may be behind it

test('the look names the two bodies and the registry builds them', () => {
  assert.deepEqual([look.body, look.cleanBody], ['smogsky', 'cleansky']);
  for (const k of ['smogsky', 'cleansky']) {
    assert.equal(typeof BODIES9[k], 'function');
    assert.equal(BODIES[k], BODIES9[k], `${k} is in the game's registry`);
  }
});

test('the sun stands upper right of centre, clear of the Craving, on the same spot for both skies', () => {
  assert.ok(SUN.x > W / 2 + 500 && SUN.y > 150 && SUN.y < 450, `${SUN.x},${SUN.y}`);
  assert.ok(SUN.x - SUN_R * 1.2 > BOSS.x1, 'the bright sun and its disc clear the boss in x');
  for (const [name, r] of [['smogsky', COIN_R], ['cleansky', SUN_R]]) {
    const T = tracker();
    BODIES[name](T.ctx, look, null);
    const hit = T.calls.find((c) => c.box[0] < SUN.x && c.box[2] > SUN.x && c.box[1] < SUN.y && c.box[3] > SUN.y && c.box[2] - c.box[0] <= 700);
    assert.ok(hit, `${name} draws something centred on the sun`);
    assert.ok(r >= 40 && r <= 70);
  }
  assert.equal(COIN_R, 46, 'the smog sun is a dull coin of about 46 px');
  assert.equal(SUN_R, 64, 'the clean one is bigger and brighter');
});

test('the smog sky has no rays and few lit things; the coin is dim; the horizon band is a soft fill', () => {
  const T = tracker();
  BODIES.smogsky(T.ctx, look, null);
  assert.ok(T.bounds.x0 >= -300 && T.bounds.x1 <= W + 300 && T.bounds.y0 >= -300 && T.bounds.y1 <= H + 300, 'inside the frame, soft glows may spill');
  const { ctx, calls } = recorder();
  BODIES.smogsky(ctx, look, null);
  assert.equal(calls.filter(([k, x, y]) => k === 'moveTo' && x === SUN.x && y === SUN.y).length, 0, 'no ray fans from the sun');
  for (const c of T.calls) if (c.comp === 'lighter') assert.ok(c.alpha <= 0.3, `an additive glow of alpha ${c.alpha}: the smog is dull`);
  assert.ok(T.calls.filter((c) => c.comp === 'lighter').length <= 4, 'the sun halo and not much else');
  const coin = T.calls.find((c) => c.comp === 'source-over' && c.box[2] - c.box[0] < 300 && c.box[2] - c.box[0] > 150 && Math.abs((c.box[0] + c.box[2]) / 2 - SUN.x) < 1);
  assert.ok(coin, 'the coin is one baked sprite on the sun');
});

test('the clean sky has a sun, a faint ring of rays from it, and cumulus that keep out of the calm middle top', () => {
  const { ctx, calls } = recorder();
  BODIES.cleansky(ctx, look, null);
  assert.equal(calls.filter(([k, x, y]) => k === 'moveTo' && x === SUN.x && y === SUN.y).length, RAYS.n, 'a ray each');
  assert.ok(RAYS.alpha <= 0.03, 'very faint rays');
  assert.ok(calls.some(([k, x, y, r]) => k === 'arc' && x === SUN.x && y === SUN.y && Math.abs(r - SUN_R * 1.18) < 1e-6), 'the sun disc');
  const T = tracker();
  BODIES.cleansky(T.ctx, look, null);
  const clouds = T.calls.filter((c) => c.box[2] - c.box[0] >= 200 && c.box[3] - c.box[1] >= 70 && c.comp === 'source-over');
  assert.ok(clouds.length >= 5, `${clouds.length} cumulus`);
  for (const c of clouds) {
    const [cx, cy] = [(c.box[0] + c.box[2]) / 2, (c.box[1] + c.box[3]) / 2];
    assert.ok(cx < 600 || cx > 1400 || cy > 520, `a cloud at ${Math.round(cx)},${Math.round(cy)} would sit in the calm middle top`);
  }
  assert.ok(T.calls.filter((c) => c.comp === 'lighter').every((c) => c.alpha <= 0.55), 'glows stay soft');
});

test("neither sky draws anything the colour of a bullet, and the gradients are the look's: umber and amber, then blue and pale", () => {
  for (const name of ['smogsky', 'cleansky']) {
    const p = probe();
    BODIES[name](p.ctx, look, null);
    const bad = p.colors.map(hexOf).filter(Boolean).filter((c) => hsl(c).s > 0.45 && hsl(c).l > 0.4 && hsl(c).h >= 290 && hsl(c).h <= 345);
    assert.deepEqual(bad, [], `${name} paints in magenta`);
  }
  const lum = (c) => hsl(c).l;
  assert.ok(lum(look.sky[0][1]) < 0.18, 'the smog sky is dark at the top: the fight shows against it');
  assert.ok(lum(look.sky.at(-1)[1]) > lum(look.sky[0][1]) * 2, 'and an amber haze lower down');
  const top = hsl(look.cleanSky[0][1]);
  assert.ok(top.h > 195 && top.h < 230 && top.s > 0.55, `a saturated blue at the top of the clean sky (${Math.round(top.h)}, ${top.s.toFixed(2)}), so the ship still reads`);
  assert.ok(hsl(look.cleanSky.at(-1)[1]).l > 0.85, 'pale at the horizon');
});

test('the baker of soft textures is empty without a pixel buffer and never throws', () => {
  const c = field(4, (x, y, px) => { px[3] = 1; });
  assert.ok(c.width >= 480 && c.height >= 270);
  const small = field(2, () => {}, 100, 50);
  assert.deepEqual([small.width, small.height], [50, 25]);
});

test('both skies leave line caps and joins, widths, colours, alpha and blend mode as they found them', () => {
  for (const name of ['smogsky', 'cleansky']) {
    const ctx = stateful();
    const before = { ...ctx };
    BODIES[name](ctx, look, null);
    assert.deepEqual({ ...ctx }, before, name);
  }
});
