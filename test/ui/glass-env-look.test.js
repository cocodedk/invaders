import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCanvas } from './dom-kit.js';
import { contrast, hue, limeish, backdropFiles } from './glass-env-kit.js';

// Glass Cathedral's environment keys in looks/w16.js (the sky, the body, the haze, the three layers, the ambient and the
// flourishes): that every kind they name exists and is registered where the game looks for it, that none of the names
// collides with another world's (the registries are merged into one object, so a duplicate silently overrides), and that the
// colours keep the enemy's bullets the loudest thing in the frame. The pieces have their own tests (glass-env-sky, -far,
// -near, -flourish, -ambient).
installCanvas(64);
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { buildLayers } = await import('../../src/ui/parallax.js');
const { paintLayer } = await import('../../src/ui/parallax-shapes.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES8 } = await import('../../src/ui/sky-bodies-8.js');
const { BODIES9 } = await import('../../src/ui/sky-bodies-9.js');
const { GLASS } = await import('../../src/ui/parallax-glass.js');
const { AMBIENT8 } = await import('../../src/ui/ambient-8.js');
const { FLOURISH_GLASS } = await import('../../src/ui/flourish-glass.js');

const look = LOOKS[15];

test('world 16 is registered and its look names a sky body, three layers, ambient entries and flourishes that all exist', () => {
  assert.equal(look.world, 16);
  assert.equal(look.body, 'glassvault');
  assert.equal(BODIES[look.body], BODIES8.glassvault);
  assert.deepEqual(look.layers.map((l) => l.kind), ['glassnave', 'glasscolumns', 'glassfloor']);
  assert.deepEqual(look.layers.map((l) => [l.height, l.speed]), [[700, 0.06], [460, 0.22], [320, 0.55]]);
  for (const l of look.layers) assert.equal(typeof GLASS[l.kind], 'function', l.kind);
  const built = buildLayers(look, 5);
  assert.deepEqual(built.map((l) => l.canvas.height), [700, 460, 320]);
  assert.deepEqual(built.map((l) => l.far), [true, false, false]);
  for (const a of look.ambient) assert.equal(typeof AMBIENT8[a.kind], 'function', a.kind);
  assert.ok(look.flourish.length >= 7);
  for (const name of look.flourish.filter((n) => n !== 'mist')) { // 'mist' is the generic low mist of flourish.js, tinted by look.mist
    assert.ok(FLOURISH_GLASS[name], name);
    assert.ok(Object.values(FLOURISH_GLASS[name]).every((f) => typeof f === 'function'), `${name} draws`);
  }
  assert.ok(look.flourish.includes('mist') && /^#[0-9a-f]{6}$/i.test(look.mist) && look.mistAlpha > 0 && look.mistAlpha <= 0.12, 'a faint rose mist over the floor');
  assert.ok(!limeish(look.mist) && hue(look.mist) > 300, 'rose');
  paintLayer(buildLayers({ ...look, layers: [look.layers[0]] }, 3)[0].canvas.getContext('2d'), 2240, 700, () => 0.5, look.layers[0], { lights: [], signs: [] });
});

test('every layer, ambient, flourish and body name is new: none is a key another world already registers', async () => {
  const other = new Set(Object.keys({ ...(await import('../../src/ui/sky-bodies-2.js')).BODIES2, ...(await import('../../src/ui/sky-bodies-3.js')).BODIES3, ...(await import('../../src/ui/sky-bodies-4.js')).BODIES4,
    ...(await import('../../src/ui/sky-bodies-5.js')).BODIES5, ...(await import('../../src/ui/sky-bodies-6.js')).BODIES6, ...(await import('../../src/ui/sky-bodies-7.js')).BODIES7 }));
  for (const k of ['arcade', 'megacity', 'twinsuns', 'redmoon']) other.add(k);
  for (const k of Object.keys(BODIES8)) assert.ok(!other.has(k), `body ${k}`);
  assert.equal(Object.keys(BODIES).length, other.size + Object.keys(BODIES8).length + Object.keys(BODIES9).length + Object.keys((await import('../../src/ui/sky-bodies-10.js')).BODIES10).length, 'one painter a world, none overridden (world 17\'s are in smog-look.test.js, world 18\'s in storm-look.test.js)');
  const layerKinds = new Set(['mountains', 'dunes', 'mesas', 'blocks', 'ground', 'ink']);
  const registries = [['parallax-city', 'CITY'], ['parallax-wild', 'WILD'], ['parallax-barren', 'BARREN'], ['parallax-harbour', 'HARBOUR'], ['parallax-gothic', 'GOTHIC'], ['parallax-ice', 'ICE'], ['parallax-archive', 'ARCHIVE'], ['parallax-armada', 'ARMADA'], ['parallax-carnival', 'CARNIVAL'], ['parallax-deep', 'DEEP']];
  for (const [file, name] of registries) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) layerKinds.add(k);
  for (const k of Object.keys(GLASS)) assert.ok(!layerKinds.has(k), `layer kind ${k}`);
  const ambientKinds = new Set(['rain', 'sand', 'petals', 'ash', 'spores', 'embers', 'twinkle']);
  for (const [file, name] of [['ambient-2', 'AMBIENT2'], ['ambient-3', 'AMBIENT3'], ['ambient-4', 'AMBIENT4'], ['ambient-5', 'AMBIENT5'], ['ambient-6', 'AMBIENT6'], ['ambient-7', 'AMBIENT7']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) ambientKinds.add(k);
  for (const k of Object.keys(AMBIENT8)) assert.ok(!ambientKinds.has(k), `ambient kind ${k}`);
  const flourishes = new Set(['searchlights', 'cars', 'neonfar', 'holo', 'neonmid', 'flares', 'mist', 'shooting']);
  for (let i = 2; i <= 13; i++) for (const k of Object.keys(Object.values(await import(`../../src/ui/flourish-${i}.js`)).find((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x && typeof x === 'object')) ?? {})) flourishes.add(k);
  for (const [file, name] of [['flourish-deep-sway', 'FLOURISH_SWAY'], ['flourish-maelstrom', 'FLOURISH_MAELSTROM']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) flourishes.add(k);
  for (const k of Object.keys(FLOURISH_GLASS)) assert.ok(!flourishes.has(k), `flourish ${k}`);
  assert.ok(flourishes.has('shafts') && flourishes.has('godrays') && !('shafts' in FLOURISH_GLASS), 'the check saw the other worlds');
});

test('an enemy bullet reads on every colour of the dawn: its dark rim on the light, its core on the dark, and nothing in the backdrop wears its lime', () => {
  const { enemy, enemyRim, alien, boss } = look.palette;
  for (const [, sky] of look.sky) {
    const best = Math.max(contrast('#ffffff', sky), contrast(enemyRim, sky));
    assert.ok(best >= 3, `${sky}: core ${contrast('#ffffff', sky).toFixed(1)}, rim ${contrast(enemyRim, sky).toFixed(1)}`);
    assert.ok(contrast(enemy, sky) >= 2.2, `the lime ring is plain against ${sky}: ${contrast(enemy, sky).toFixed(1)}`);
  }
  for (const L of look.layers) assert.ok(contrast(enemy, L.color) >= 3, `${L.kind} ${L.color}`);
  assert.ok(Math.max(contrast('#ffffff', look.haze), contrast(enemyRim, look.haze)) >= 3, 'a bullet reads on the haze too');
  assert.ok(look.sky.every(([, c]) => !limeish(c)) && !limeish(look.haze) && look.layers.every((l) => !limeish(l.color) && !limeish(l.rim)));
  assert.ok(limeish(enemy) && !Object.values(alien).some(limeish), 'the check knows the bullets lime from the aliens');
  assert.ok(contrast(boss.weak, boss.hull) > 6, 'the moth\'s weak points stand out of the dark');
  assert.ok(hue(look.sky[0][1]) > 200 && hue(look.sky.at(-1)[1]) > 300, 'indigo at the top, rose at the horizon');
  const lum = look.sky.map(([, c]) => contrast('#000000', c));
  assert.ok(lum.every((v, i) => i === 0 || v >= lum[i - 1] - 1e-9), 'the sky only gets lighter toward the horizon');
});

test('the files of the backdrop follow the sprite rules: no shadow blur, no clock or dice, under 200 lines', () => {
  const { dir, names } = backdropFiles();
  assert.ok(names.length >= 18, `the backdrop is split over many files: ${names.join(', ')}`);
  for (const name of names) {
    const src = readFileSync(new URL(name, dir), 'utf8');
    assert.ok(src.split('\n').length < 200, `${name} is under 200 lines`);
    assert.ok(!/shadowBlur|Math\.random|Date\.now/.test(src), `${name} uses no shadow blur, dice or clock`);
    assert.match(src, /^\/\/ .{20,}/, `${name} opens with a comment`);
  }
});
