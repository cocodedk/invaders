import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, contrast, hue, lum, backdropFiles } from './bath-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// World 19's look (looks/w19.js) as a whole: registered as Rubber Regatta for all five levels; every body, layer kind, ambient kind
// and flourish it names exists, is registered where the game looks for it and is new (the registries are merged into one object, so
// a duplicate silently overrides); the value rule of the plan's "Look" (the renderer lights with 'lighter', which vanishes on a pale
// field, so the fight is on a mid-value wall); nothing teal; and the file rules. The pieces have their own tests (bath-env.test.js).
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES11, SHAFTS } = await import('../../src/ui/sky-bodies-11.js');
const { BATH } = await import('../../src/ui/parallax-bath.js');
const { AMBIENT11 } = await import('../../src/ui/ambient-11.js');
const { FLOURISH_BATH } = await import('../../src/ui/flourish-bath.js');
const { PAL, SHEEN_A, SUN } = await import('../../src/ui/sky-bodies-11-kit.js');

// The value rule (plan, "Look"), and what counts as teal.
const FIGHT_TO = 0.7; // a wall stop at this position or above it lies where the fight is
const WALL_LUM = 0.3; // and is no brighter than this luminance
const DARK = [0, 0.45]; // the stops the cast is measured against
const CAST = 1.9; // every alien colour, the hull and the weak colour against those
const BULLET = 1.8; // the enemy bullet against those
const BULLET_PALE = 2; // and against the two pale stops
const RIM = 2.5; // its rim against every stop
const TEAL = [150, 200]; // hues no stop may wear
const GREY = 0.12; // a colour less saturated than this has no hue worth the name
const SUN_A = 0.25; // the most the sun's shafts and its blur in the window are laid at over the wall (so the wall stays mid-value)
const saturation = (hex) => {
  const [hi, lo] = [Math.max(...rgb(hex)), Math.min(...rgb(hex))];
  return hi ? (hi - lo) / hi : 0;
};
const teal = (hex) => saturation(hex) >= GREY && hue(hex) >= TEAL[0] && hue(hex) <= TEAL[1];
const stop = (at) => look.sky.find(([p]) => p === at)[1];
const flat = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(flat));

test('world 19 is registered as Rubber Regatta and its five levels, the boss level among them, get this look', () => {
  assert.equal(LOOKS.length, 19);
  assert.equal(LOOKS[18], look);
  assert.equal(look.world, 19);
  assert.equal(WORLDS[18].name, 'Rubber Regatta');
  for (let i = 1; i <= 5; i++) assert.equal(lookFor(levelById(`w19-${i}`)), look, `w19-${i}`);
});

test('the look names a sky body, three layers, ambient entries and flourishes that all exist', () => {
  assert.equal(BODIES[look.body], BODIES11.bathwall);
  assert.deepEqual(look.layers.map((l) => l.kind), ['bathtaps', 'bathshelf', 'bathfoam']);
  assert.deepEqual(look.layers.map((l) => [l.height, l.speed]), [[700, 0.06], [460, 0.22], [320, 0.55]]);
  for (const l of look.layers) assert.equal(typeof BATH[l.kind], 'function', l.kind);
  assert.deepEqual(look.ambient.map((a) => a.kind).toSorted(), ['soapbubbles', 'steamwisps', 'waterglints']);
  for (const a of look.ambient) assert.equal(typeof AMBIENT11[a.kind], 'function', a.kind);
  assert.ok(look.ambient.every((a) => a.n <= 70 && a.alpha <= 0.4), 'every ambient entry stays within its budget and quiet');
  assert.deepEqual(look.flourish.toSorted(), ['bathbubble', 'bathdrip', 'bathspurt', 'bathsteamer']);
  for (const name of look.flourish) {
    assert.ok(FLOURISH_BATH[name], name);
    assert.ok(Object.values(FLOURISH_BATH[name]).every((f) => typeof f === 'function'), `${name} draws`);
  }
});

test('every body, layer kind, ambient kind and flourish name of world 19 is new: none is a key another world registers', async () => {
  const keys = async (pairs) => {
    const set = new Set();
    for (const [file, name] of pairs) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) set.add(k);
    return set;
  };
  const sky = await keys([2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => [`sky-bodies-${i}`, `BODIES${i}`]));
  for (const k of ['arcade', 'megacity', 'twinsuns', 'redmoon']) sky.add(k);
  for (const k of Object.keys(BODIES11)) assert.ok(!sky.has(k), `body ${k}`);
  assert.equal(Object.keys(BODIES).length, sky.size + Object.keys(BODIES11).length, 'one painter a world, none overridden');
  const layers = await keys([['parallax-city', 'CITY'], ['parallax-wild', 'WILD'], ['parallax-barren', 'BARREN'], ['parallax-harbour', 'HARBOUR'], ['parallax-gothic', 'GOTHIC'], ['parallax-ice', 'ICE'], ['parallax-archive', 'ARCHIVE'], ['parallax-armada', 'ARMADA'], ['parallax-carnival', 'CARNIVAL'], ['parallax-deep', 'DEEP'], ['parallax-glass', 'GLASS'], ['parallax-smog', 'SMOG'], ['parallax-storm', 'STORM']]);
  for (const k of ['mountains', 'dunes', 'mesas', 'blocks', 'ground', 'ink']) layers.add(k);
  for (const k of Object.keys(BATH)) assert.ok(!layers.has(k), `layer kind ${k}`);
  const ambient = await keys([2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => [`ambient-${i}`, `AMBIENT${i}`]));
  for (const k of ['rain', 'sand', 'petals', 'ash', 'spores', 'embers', 'twinkle']) ambient.add(k);
  for (const k of Object.keys(AMBIENT11)) assert.ok(!ambient.has(k), `ambient kind ${k}`);
  const flourishes = await keys([['flourish-deep-sway', 'FLOURISH_SWAY'], ['flourish-maelstrom', 'FLOURISH_MAELSTROM'], ['flourish-glass', 'FLOURISH_GLASS'], ['flourish-smog', 'FLOURISH_SMOG'], ['flourish-storm', 'FLOURISH_STORM']]);
  for (const k of ['searchlights', 'cars', 'neonfar', 'holo', 'neonmid', 'flares', 'mist', 'shooting']) flourishes.add(k);
  for (let i = 2; i <= 13; i++) for (const k of Object.keys(Object.values(await import(`../../src/ui/flourish-${i}.js`)).find((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x && typeof x === 'object')) ?? {})) flourishes.add(k);
  for (const [name, phases] of Object.entries(FLOURISH_BATH)) {
    assert.ok(!flourishes.has(name), `flourish ${name}`);
    assert.ok(Object.keys(phases).every((p) => ['sky', 'far', 'mid', 'near', 'front', 'screen'].includes(p)), `${name}'s phases`);
  }
});

test("the value rule: the wall is mid-value where the fight is, and the cast, the hull, the weak parts and the enemy's bullet stand out of it", () => {
  for (const [at, c] of look.sky) if (at <= FIGHT_TO) assert.ok(lum(c) <= WALL_LUM, `the stop at ${at} (${c}) is ${lum(c).toFixed(3)} bright`);
  const { alien, boss, enemy, enemyRim } = look.palette;
  for (const at of DARK) {
    for (const c of [...Object.values(alien), boss.hull, boss.weak]) assert.ok(contrast(c, stop(at)) >= CAST, `${c} on the stop at ${at}: ${contrast(c, stop(at)).toFixed(2)}`);
    assert.ok(contrast(enemy, stop(at)) >= BULLET, `the bullet on the stop at ${at}: ${contrast(enemy, stop(at)).toFixed(2)}`);
  }
  const pale = look.sky.filter(([, c]) => lum(c) > WALL_LUM);
  assert.equal(pale.length, 2, 'two pale stops, at the waterline');
  for (const [at, c] of pale) {
    assert.ok(at > FIGHT_TO, `the pale stop at ${at} is under the fight`);
    assert.ok(contrast(enemy, c) >= BULLET_PALE, `the bullet on the stop at ${at}: ${contrast(enemy, c).toFixed(2)}`);
  }
  for (const [at, c] of look.sky) assert.ok(contrast(enemyRim, c) >= RIM, `the bullet's rim on the stop at ${at}: ${contrast(enemyRim, c).toFixed(2)}`);
});

test('nothing in the room is teal: not the wall, not a colour the backdrop paints, not a layer, rim, glow or ambient colour', () => {
  for (const [at, c] of look.sky) assert.ok(!teal(c), `the stop at ${at} (${c}) is teal: hue ${hue(c).toFixed(0)}`);
  const painted = [...flat(PAL), look.haze, ...look.layers.flatMap((l) => [l.color, l.rim, l.glow].filter(Boolean)), ...look.ambient.flatMap((a) => a.colors)];
  for (const c of painted) assert.ok(!teal(c), `${c} is teal: hue ${hue(c).toFixed(0)}`);
});

test('the body, the far layer and the middle one keep the rule too: what they paint where the fight is is mid-value', () => {
  const { grout, dark, light, crack } = PAL.wall;
  for (const c of [grout, dark, light, crack, PAL.glass, PAL.glassSun, PAL.frame, PAL.brass.dark, PAL.brass.body, look.layers[0].color, look.layers[1].color]) {
    assert.ok(lum(c) <= WALL_LUM, `${c} is ${lum(c).toFixed(3)} bright`);
  }
  assert.ok(SHEEN_A <= 0.15, 'the glaze\'s pale sheen is laid thin');
  assert.ok(SHAFTS.every(([, , peak]) => peak <= SUN_A) && SUN.a <= SUN_A, 'the sun is laid thin over the wall');
});

test('the backdrop files keep the sprite rules: under 200 lines, no shadow blur, no dice, no clock', () => {
  const { names, read } = backdropFiles();
  assert.ok(names.length >= 14, `${names.length} files`);
  for (const n of names) {
    const src = read(n);
    assert.ok(src.split('\n').length < 200, `${n} is ${src.split('\n').length} lines`);
    for (const bad of ['shadowBlur', 'Math.random', 'Date.now', 'performance.now']) assert.ok(!src.includes(bad), `${n} uses ${bad}`);
  }
});
