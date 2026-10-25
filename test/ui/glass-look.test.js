import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUNKER } from '../../src/core/bunkers.js';
import { installCanvas, recorder } from './dom-kit.js';
import { tracker } from './galleon-track.js';
import { rgb } from '../../src/ui/sprites.js';

// The Glass Cathedral's look (looks/w16.js) as a whole: that world 16 is registered, that its colours keep the enemy's
// bullets the loudest thing in the frame, and the pieces that belong to the player's side of it: the glass bunker skin, the
// quatrefoil pickup rim and the mirror's icon. The environment, the aliens and the moth have their own tests
// (glass-env-*, aliens-glass*, moth*), the twin, its bolts and the mending glass-twin and glass-mending.
installCanvas(64);
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { glassWall } = await import('../../src/ui/bunker-glass.js');
const { FRAMES, ICONS } = await import('../../src/ui/pickup-skins.js');
const { drawIcon } = await import('../../src/ui/pickups-view.js');
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { POWERS_16 } = await import('../../src/core/kinds.js');

const look = LOOKS[15];

const lum = (h) => rgb(h).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

test('world 16 is registered as the Glass Cathedral and every level of it gets this look', () => {
  assert.equal(LOOKS.length, 17);
  assert.equal(look.world, 16);
  assert.equal(WORLDS[15].name, 'Glass Cathedral');
  const level = levelById('w16-3');
  if (level) assert.equal(lookFor(level), look);
  assert.equal(look.music.mood, 'glass');
  assert.equal(look.bunker.skin, 'glass');
  assert.equal(look.bullet, 'orb');
});

test('the look gives every power of the world a tint, and the mirror\'s is glass', () => {
  for (const kind of [...POWERS_16, 'bomb', 'life']) assert.ok(look.power[kind], `a tint for ${kind}`);
  assert.equal(POWERS_16.at(-1), 'mirror');
  assert.ok(contrast(look.power.mirror, '#0c0830') > 8, 'pale, so it reads on the dark');
  const tints = Object.values(look.power);
  assert.equal(new Set(tints).size, tints.length, 'no two powers share a colour');
  assert.ok(Math.min(...tints.filter((c) => c !== look.power.mirror).map((c) => dist(c, look.power.mirror))) > 40, 'and no other tint is near the mirror\'s');
});

test('an enemy bullet reads on every colour of the sky, and nothing living or lit wears its acid lime', () => {
  const { enemy, enemyRim, alien, shot, beam, boss, accent } = look.palette;
  for (const [, sky] of look.sky) {
    const best = Math.max(contrast('#ffffff', sky), contrast(enemyRim, sky), contrast(enemy, sky));
    assert.ok(best >= 3, `${sky}: the best of core, ring and rim is ${best.toFixed(1)}`);
  }
  assert.ok(contrast(enemy, enemyRim) >= 8, 'the ring stands out from its dark rim');
  for (const c of [...Object.values(alien), ...Object.values(boss), shot, beam, accent, ...Object.values(look.power)]) {
    assert.ok(dist(enemy, c) >= 90, `${c} is too near the enemy's lime (${dist(enemy, c).toFixed(0)})`);
  }
  assert.ok(contrast(accent, look.sky[0][1]) > 6 && contrast(boss.weak, boss.hull) > 6, 'the ship and the weak points stand out of the dark');
  assert.ok(new Set(Object.values(alien)).size === 5, 'five roles, five colours');
  const roles = Object.values(alien);
  for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) assert.ok(dist(roles[i], roles[j]) > 60, `${roles[i]} and ${roles[j]} are told apart`);
});

// ---- the bunker skin ----
const { w: W, h: H } = BUNKER;
const P = {};
for (const k of ['fill', 'light', 'dark', 'edge', 'accent']) P[k] = rgb(look.bunker[k]);
const bake = (w = W, h = H) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => glassWall(x, y, w, h, P)));

test('the glass skin is registered beside the others\' and gives a colour and a blend in [-1, 1] at every pixel of any bunker size, the same every time', () => {
  assert.equal(SKINS.glass, glassWall);
  for (const [w, h] of [[W, H], [100, 40], [240, 60], [160, 80]]) {
    const [a, b] = [bake(w, h), bake(w, h)];
    assert.deepEqual(a, b, `${w}x${h}: deterministic`);
    for (const row of a) for (const [c, k] of row) assert.ok(c.length === 3 && c.every((v) => v >= 0 && v <= 255) && Number.isFinite(k) && k >= -1 && k <= 1, `colour ${c} blend ${k}`);
  }
});

test('the wall is a row of leaded jewel windows between stone: a cornice with dentils, five windows, mullions, a sill', () => {
  const px = bake();
  const colour = (x, y) => px[y][x][0];
  const isStone = (c) => c === P.fill || c === P.light || c === P.dark;
  let jewels = 0;
  const glasses = new Set();
  for (let y = 12; y < 48; y++) for (let x = 0; x < W; x++) {
    const c = colour(x, y);
    if (!isStone(c)) {
      jewels++;
      glasses.add(c);
    }
  }
  assert.ok(jewels > 2800, `${jewels} px of coloured glass`);
  assert.ok(glasses.size >= 5, `${glasses.size} colours of glass: rose, cobalt, amber, violet, gold, ruby`);
  const share = (y0, y1, test) => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = 6; x < W - 6; x++) n += test(colour(x, y)) ? 1 : 0;
    return n / ((y1 - y0) * (W - 12));
  };
  assert.ok(share(2, 6, isStone) === 1, 'the cornice is stone from end to end');
  assert.ok(share(54, 60, isStone) > 0.99, 'and so is the sill');
  const seams = [];
  for (let x = 4; x < W - 4; x++) if (isStone(colour(x, 36)) && !isStone(colour(x - 1, 36)) === false && isStone(colour(x, 30)) && isStone(colour(x, 40))) seams.push(x);
  assert.ok(seams.length >= 8 && seams.length <= 40, `${seams.length} columns of stone through the glass: the mullions`);
  const colours = new Set(px.flat().map(([c, k]) => `${c}|${Math.round(k * 20)}`));
  assert.ok(colours.size > 80, `${colours.size} distinct tones: nothing flat`);
});

test('the glass skin is its own texture: no other skin shares more than one pixel in ten of its colours and blends', () => {
  const mine = bake();
  for (const [name, skin] of Object.entries(SKINS)) {
    if (name === 'glass') continue;
    let same = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const [c, k] = skin(x, y, W, H, P);
      if (c === mine[y][x][0] && Math.abs(k - mine[y][x][1]) < 0.05) same++;
    }
    assert.ok(same / (W * H) < 0.1, `${name} agrees at ${((same / (W * H)) * 100).toFixed(1)}% of pixels`);
  }
});

// ---- the pickup ----
test('the pickup rim is a quatrefoil of gold and jewels, drawn inside its 60 px sprite for every colour a power wears', () => {
  assert.equal(typeof FRAMES[16], 'function');
  assert.ok(FRAMES[16] !== FRAMES[15] && FRAMES[16] !== FRAMES[14]);
  for (const color of new Set(Object.values(look.power))) {
    const T = tracker();
    T.ctx.translate(30, 30);
    FRAMES[16](T.ctx, color);
    const b = T.bounds;
    assert.ok(b.x0 >= 1 && b.y0 >= 1 && b.x1 <= 59 && b.y1 <= 59, `${color}: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))} lies inside the sprite`);
    assert.ok(b.x1 - b.x0 > 52 && b.y1 - b.y0 > 52, 'and fills it');
  }
  const r = recorder();
  FRAMES[16](r.ctx, look.power.spread);
  const used = new Set(r.calls.filter(([k]) => k === 'arc').map(([, x, y, rad]) => `${Math.round(x)},${Math.round(y)},${rad}`));
  assert.ok(used.size >= 10, `${used.size} distinct circles: four lobes, four jewels, the finial beads and the rings`);
});

test('the mirror\'s icon is a ship and its reflection with the mirror between: plain paths, in the power\'s colour, for the HUD ring too', () => {
  assert.equal(typeof ICONS[16].mirror, 'function');
  assert.deepEqual(Object.keys(ICONS[16]), ['mirror'], 'the other powers keep the default icons');
  const stateful = () => {
    const state = { lineCap: 'butt', lineJoin: 'miter', lineWidth: 1, strokeStyle: '#000000', fillStyle: '#000000', globalAlpha: 1, globalCompositeOperation: 'source-over' };
    const stack = [];
    return new Proxy(state, {
      get: (o, k) => (k === 'save' ? () => stack.push({ ...o }) : k === 'restore' ? () => Object.assign(o, stack.pop()) : k in o ? o[k] : () => recorder().ctx),
      set: (o, k, v) => ((o[k] = v), true),
    });
  };
  const g = stateful();
  const before = { ...g };
  drawIcon(g, 'mirror', look.power.mirror, 16);
  assert.deepEqual({ ...g }, before, 'the icon leaves the context as it found it');
  const T = tracker();
  drawIcon(T.ctx, 'mirror', look.power.mirror, 16);
  const b = T.bounds;
  assert.ok(b.x0 >= -18 && b.x1 <= 18 && b.y0 >= -16 && b.y1 <= 16, `about 30 px across: ${[b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1))}`);
  assert.ok(b.x1 - b.x0 > 24 && b.y1 - b.y0 > 20, 'and fills it');
  const r = recorder();
  drawIcon(r.ctx, 'spread', look.power.spread, 16);
  assert.ok(r.calls.length > 3, 'the default icons still draw in this world');
});

test('the debug grant list names the mirror, and the quatrefoil, the skin and the shared kit follow the sprite rules', () => {
  assert.ok(/'mirror' \(world 16\)/.test(readFileSync(new URL('../../src/ui/debug-hooks.js', import.meta.url), 'utf8')));
  for (const name of ['pickup-glass.js', 'bunker-glass.js', 'pickup-skins.js', 'bunker-skins.js', 'glass-kit.js']) {
    const src = readFileSync(new URL(`../../src/ui/${name}`, import.meta.url), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
  }
});
