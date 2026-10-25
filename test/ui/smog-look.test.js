import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCanvas } from './dom-kit.js';
import { contrast, hue } from './glass-env-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// World 17's look (looks/w17.js) as a whole: that it is registered as Ash to Air, that every body, layer kind, ambient kind and flourish
// it names exists and is registered where the game looks for it and is new (the registries are merged into one object, so a duplicate
// silently overrides), and that the colours keep the enemy's hot magenta bullets the loudest thing in a brown smog, a blue morning and
// a green park alike. The pieces have their own tests (smogenv1-*, smogenv2-*, smogal*, craving-*, breath-*, smogprop-*, heal*).
installCanvas(64);
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { POWERS } = await import('../../src/core/kinds.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES9 } = await import('../../src/ui/sky-bodies-9.js');
const { SMOG } = await import('../../src/ui/parallax-smog.js');
const { AMBIENT9 } = await import('../../src/ui/ambient-9.js');
const { FLOURISH_SMOG } = await import('../../src/ui/flourish-smog.js');
const { SKINS } = await import('../../src/ui/bunker-skins.js');
const { FRAMES } = await import('../../src/ui/pickup-skins.js');
const { BOSS_ART } = await import('../../src/ui/bosses/bake.js');

const look = LOOKS[16];
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
// The bullets' hot magenta and its neighbours: hues 290-335 that are bright and saturated.
const magentaish = (hex) => {
  const [r, g, b] = rgb(hex);
  const [hi, lo] = [Math.max(r, g, b), Math.min(r, g, b)];
  const h = hue(hex);
  return h >= 290 && h <= 335 && hi > 140 && (hi - lo) / hi > 0.4;
};

test('world 17 is registered as Ash to Air and every level of it gets this look', () => {
  assert.equal(LOOKS.length, 17);
  assert.equal(look.world, 17);
  assert.equal(WORLDS[16].name, 'Ash to Air');
  for (let i = 1; i <= 5; i++) assert.equal(lookFor(levelById(`w17-${i}`)), look);
  assert.equal(look.heal, true);
  assert.equal(look.bullet, 'orb');
  assert.equal(look.bunker.skin, 'filter');
  assert.ok(SKINS.filter && SKINS.filter !== SKINS.glass, 'its own bunker skin');
  assert.equal(typeof FRAMES[17], 'function');
  assert.ok(FRAMES[17] !== FRAMES[16] && FRAMES[17] !== FRAMES[15], 'its own pickup rim');
  assert.ok(BOSS_ART.craving?.hull && BOSS_ART.craving.parts.crown, 'the Craving has art');
});

test('the look names a smog sky and a clean sky, three layers, ambient entries and flourishes that all exist', () => {
  assert.deepEqual(Object.keys(BODIES9).toSorted(), ['cleansky', 'smogsky']);
  assert.equal(BODIES[look.body], BODIES9.smogsky);
  assert.equal(BODIES[look.cleanBody], BODIES9.cleansky);
  assert.deepEqual(look.layers.map((l) => l.kind), ['smogcity', 'smogblocks', 'smogstreet']);
  assert.deepEqual(look.layers.map((l) => [l.height, l.speed]), [[700, 0.06], [460, 0.22], [320, 0.55]]);
  for (const l of look.layers) {
    assert.equal(typeof SMOG[l.kind], 'function', l.kind);
    assert.ok(l.colorClean && l.rimClean && l.over === true, `${l.kind} has its clean twin and its green overlay`);
  }
  assert.ok(look.cleanSky.length >= 4 && look.hazeClean && look.sky.length >= 4);
  for (const a of look.ambient) assert.equal(typeof AMBIENT9[a.kind], 'function', a.kind);
  assert.ok(look.ambient.every((a) => a.n <= 70), 'every ambient entry stays within its budget');
  for (const name of look.flourish) {
    assert.ok(FLOURISH_SMOG[name], name);
    assert.ok(Object.values(FLOURISH_SMOG[name]).every((f) => typeof f === 'function'), `${name} draws`);
  }
  for (const name of ['smokeroll', 'cigarettes', 'sunbeams', 'skybirds', 'kites', 'smogbank']) assert.ok(look.flourish.includes(name), name);
});

test('every body, layer kind, ambient kind and flourish name of world 17 is new: none is a key another world registers', async () => {
  const sky = new Set(['arcade', 'megacity', 'twinsuns', 'redmoon']);
  for (const [file, name] of [['sky-bodies-2', 'BODIES2'], ['sky-bodies-3', 'BODIES3'], ['sky-bodies-4', 'BODIES4'], ['sky-bodies-5', 'BODIES5'], ['sky-bodies-6', 'BODIES6'], ['sky-bodies-7', 'BODIES7'], ['sky-bodies-8', 'BODIES8']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) sky.add(k);
  for (const k of Object.keys(BODIES9)) assert.ok(!sky.has(k), `body ${k}`);
  assert.equal(Object.keys(BODIES).length, sky.size + Object.keys(BODIES9).length, 'one painter a world, none overridden');
  const layers = new Set(['mountains', 'dunes', 'mesas', 'blocks', 'ground', 'ink']);
  for (const [file, name] of [['parallax-city', 'CITY'], ['parallax-wild', 'WILD'], ['parallax-barren', 'BARREN'], ['parallax-harbour', 'HARBOUR'], ['parallax-gothic', 'GOTHIC'], ['parallax-ice', 'ICE'], ['parallax-archive', 'ARCHIVE'], ['parallax-armada', 'ARMADA'], ['parallax-carnival', 'CARNIVAL'], ['parallax-deep', 'DEEP'], ['parallax-glass', 'GLASS']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) layers.add(k);
  for (const k of Object.keys(SMOG)) assert.ok(!layers.has(k), `layer kind ${k}`);
  const ambient = new Set(['rain', 'sand', 'petals', 'ash', 'spores', 'embers', 'twinkle']);
  for (const [file, name] of [['ambient-2', 'AMBIENT2'], ['ambient-3', 'AMBIENT3'], ['ambient-4', 'AMBIENT4'], ['ambient-5', 'AMBIENT5'], ['ambient-6', 'AMBIENT6'], ['ambient-7', 'AMBIENT7'], ['ambient-8', 'AMBIENT8']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) ambient.add(k);
  for (const k of Object.keys(AMBIENT9)) assert.ok(!ambient.has(k), `ambient kind ${k}`);
  const flourishes = new Set(['searchlights', 'cars', 'neonfar', 'holo', 'neonmid', 'flares', 'mist', 'shooting']);
  for (let i = 2; i <= 13; i++) for (const k of Object.keys(Object.values(await import(`../../src/ui/flourish-${i}.js`)).find((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x && typeof x === 'object')) ?? {})) flourishes.add(k);
  for (const [file, name] of [['flourish-deep-sway', 'FLOURISH_SWAY'], ['flourish-maelstrom', 'FLOURISH_MAELSTROM'], ['flourish-glass', 'FLOURISH_GLASS']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) flourishes.add(k);
  for (const [name, phases] of Object.entries(FLOURISH_SMOG)) {
    assert.ok(!flourishes.has(name), `flourish ${name}`);
    assert.ok(Object.keys(phases).every((p) => ['sky', 'far', 'mid', 'near', 'front', 'screen'].includes(p)), `${name}'s phases`);
  }
});

test('an enemy bullet reads on every colour of the smog, the morning and the park, and nothing in the backdrop is its magenta', () => {
  const { enemy, enemyRim } = look.palette;
  const skies = [...look.sky, ...look.cleanSky].map(([, c]) => c);
  for (const c of [...skies, look.haze, look.hazeClean, ...look.layers.flatMap((l) => [l.color, l.colorClean])]) {
    const best = Math.max(contrast('#ffffff', c), contrast(enemyRim, c), contrast(enemy, c));
    assert.ok(best >= 3, `${c}: the best of core, ring and rim is ${best.toFixed(1)}`);
  }
  assert.ok(contrast(enemy, enemyRim) >= 3.5, 'the ring stands out from its dark rim');
  assert.ok(magentaish(enemy), "the check knows the bullets' magenta");
  const backdrop = [...skies, look.haze, look.hazeClean, look.mist, ...look.layers.flatMap((l) => [l.color, l.colorClean, l.rim, l.rimClean]), ...look.ambient.flatMap((a) => a.colors)];
  for (const c of backdrop) assert.ok(!magentaish(c), `${c} is too near the bullets' magenta`);
  assert.ok(look.ambient.every((a) => a.alpha <= 0.4), 'every ambient entry stays quiet');
});

test('the palette keeps the five roles, the boss and the powers told apart from each other and from the bullets', () => {
  const { enemy, alien, boss, shot, beam, accent } = look.palette;
  const roles = Object.values(alien);
  assert.equal(Object.keys(alien).join(), 'grunt,diver,gunner,armored,carrier');
  for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) assert.ok(dist(roles[i], roles[j]) > 40, `${roles[i]} and ${roles[j]} are told apart`);
  assert.ok(contrast(boss.weak, boss.hull) > 6, 'the weak points stand out of the dark');
  assert.ok(contrast(accent, look.sky[0][1]) > 6, 'the ship stands out of the smog');
  for (const c of [...roles, ...Object.values(boss), shot, beam, accent, ...Object.values(look.power)]) assert.ok(dist(enemy, c) >= 90, `${c} is too near the bullets' magenta (${dist(enemy, c).toFixed(0)})`);
  for (const kind of [...POWERS, 'bomb', 'life']) assert.ok(look.power[kind], `a tint for ${kind}`);
  const tints = Object.values(look.power);
  assert.equal(new Set(tints).size, tints.length, 'no two powers share a colour');
});
