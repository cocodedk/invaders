import { test } from 'node:test';
import assert from 'node:assert/strict';
import { look, contrast, roseish, backdropFiles } from './storm-kit.js';
import { rgb } from '../../src/ui/sprites.js';

// World 18's look (looks/w18.js) as a whole: that it is registered as Anvil Sky, that every body, layer kind, ambient kind and flourish it names exists,
// is registered where the game looks for it and is new (the registries are merged into one object, so a duplicate silently overrides), and that the
// colours keep the enemy's hot rose bullets the loudest thing in the storm. The pieces have their own tests (storm-env.test.js).
const { LOOKS, lookFor } = await import('../../src/ui/looks/index.js');
const { WORLDS, levelById } = await import('../../src/core/levels.js');
const { POWERS } = await import('../../src/core/kinds.js');
const { BODIES } = await import('../../src/ui/sky-bodies.js');
const { BODIES10 } = await import('../../src/ui/sky-bodies-10.js');
const { STORM } = await import('../../src/ui/parallax-storm.js');
const { AMBIENT10 } = await import('../../src/ui/ambient-10.js');
const { FLOURISH_STORM } = await import('../../src/ui/flourish-storm.js');

const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

test('world 18 is registered as Anvil Sky and its one level gets this look', () => {
  assert.equal(LOOKS[17], look);
  assert.equal(look.world, 18);
  assert.equal(WORLDS[17].name, 'Anvil Sky');
  assert.equal(lookFor(levelById('w18-1')), look);
  assert.equal(look.bullet, 'orb');
});

test('the look names a sky body, three layers, ambient entries and flourishes that all exist', () => {
  assert.equal(BODIES[look.body], BODIES10.stormdusk);
  assert.deepEqual(look.layers.map((l) => l.kind), ['stormanvils', 'stormpillars', 'stormdeck']);
  assert.deepEqual(look.layers.map((l) => [l.height, l.speed]), [[700, 0.06], [460, 0.22], [320, 0.55]]);
  for (const l of look.layers) assert.equal(typeof STORM[l.kind], 'function', l.kind);
  assert.ok(look.layers[0].glow && look.layers[1].glow, 'the two cloud layers carry the colour of the light inside them');
  for (const a of look.ambient) assert.equal(typeof AMBIENT10[a.kind], 'function', a.kind);
  assert.ok(look.ambient.every((a) => a.n <= 70 && a.alpha <= 0.4), 'every ambient entry stays within its budget and quiet');
  for (const name of look.flourish.filter((n) => n !== 'mist')) { // mist is the generic low bank (flourish.js)
    assert.ok(FLOURISH_STORM[name], name);
    assert.ok(Object.values(FLOURISH_STORM[name]).every((f) => typeof f === 'function'), `${name} draws`);
  }
  for (const name of ['stormsheet', 'stormbolts', 'stormcurtains', 'stormsun', 'stormgusts']) assert.ok(look.flourish.includes(name), name);
});

test('every body, layer kind, ambient kind and flourish name of world 18 is new: none is a key another world registers', async () => {
  const sky = new Set(['arcade', 'megacity', 'twinsuns', 'redmoon']);
  for (const [file, name] of [['sky-bodies-2', 'BODIES2'], ['sky-bodies-3', 'BODIES3'], ['sky-bodies-4', 'BODIES4'], ['sky-bodies-5', 'BODIES5'], ['sky-bodies-6', 'BODIES6'], ['sky-bodies-7', 'BODIES7'], ['sky-bodies-8', 'BODIES8'], ['sky-bodies-9', 'BODIES9']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) sky.add(k);
  for (const k of Object.keys(BODIES10)) assert.ok(!sky.has(k), `body ${k}`);
  assert.equal(Object.keys(BODIES).length, sky.size + Object.keys(BODIES10).length, 'one painter a world, none overridden');
  const layers = new Set(['mountains', 'dunes', 'mesas', 'blocks', 'ground', 'ink']);
  for (const [file, name] of [['parallax-city', 'CITY'], ['parallax-wild', 'WILD'], ['parallax-barren', 'BARREN'], ['parallax-harbour', 'HARBOUR'], ['parallax-gothic', 'GOTHIC'], ['parallax-ice', 'ICE'], ['parallax-archive', 'ARCHIVE'], ['parallax-armada', 'ARMADA'], ['parallax-carnival', 'CARNIVAL'], ['parallax-deep', 'DEEP'], ['parallax-glass', 'GLASS'], ['parallax-smog', 'SMOG']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) layers.add(k);
  for (const k of Object.keys(STORM)) assert.ok(!layers.has(k), `layer kind ${k}`);
  const ambient = new Set(['rain', 'sand', 'petals', 'ash', 'spores', 'embers', 'twinkle']);
  for (const [file, name] of [['ambient-2', 'AMBIENT2'], ['ambient-3', 'AMBIENT3'], ['ambient-4', 'AMBIENT4'], ['ambient-5', 'AMBIENT5'], ['ambient-6', 'AMBIENT6'], ['ambient-7', 'AMBIENT7'], ['ambient-8', 'AMBIENT8'], ['ambient-9', 'AMBIENT9']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) ambient.add(k);
  for (const k of Object.keys(AMBIENT10)) assert.ok(!ambient.has(k), `ambient kind ${k}`);
  const flourishes = new Set(['searchlights', 'cars', 'neonfar', 'holo', 'neonmid', 'flares', 'mist', 'shooting']);
  for (let i = 2; i <= 13; i++) for (const k of Object.keys(Object.values(await import(`../../src/ui/flourish-${i}.js`)).find((v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x && typeof x === 'object')) ?? {})) flourishes.add(k);
  for (const [file, name] of [['flourish-deep-sway', 'FLOURISH_SWAY'], ['flourish-maelstrom', 'FLOURISH_MAELSTROM'], ['flourish-glass', 'FLOURISH_GLASS'], ['flourish-smog', 'FLOURISH_SMOG']]) for (const k of Object.keys((await import(`../../src/ui/${file}.js`))[name])) flourishes.add(k);
  for (const [name, phases] of Object.entries(FLOURISH_STORM)) {
    assert.ok(!flourishes.has(name), `flourish ${name}`);
    assert.ok(Object.keys(phases).every((p) => ['sky', 'far', 'mid', 'near', 'front', 'screen'].includes(p)), `${name}'s phases`);
  }
});

test('an enemy bullet reads on every colour of the storm, and nothing in the backdrop is its rose', () => {
  const { enemy, enemyRim } = look.palette;
  const skies = look.sky.map(([, c]) => c);
  for (const c of [...skies, look.haze, ...look.layers.map((l) => l.color)]) {
    const best = Math.max(contrast('#ffffff', c), contrast(enemyRim, c), contrast(enemy, c));
    assert.ok(best >= 3, `${c}: the best of core, ring and rim is ${best.toFixed(1)}`);
  }
  assert.ok(contrast(enemy, enemyRim) >= 3.5, 'the ring stands out from its dark rim');
  assert.ok(roseish(enemy), "the check knows the bullets' rose");
  const backdrop = [...skies, look.haze, look.mist, ...look.layers.flatMap((l) => [l.color, l.rim, l.glow].filter(Boolean)), ...look.ambient.flatMap((a) => a.colors)];
  for (const c of backdrop) assert.ok(!roseish(c), `${c} is too near the bullets' rose`);
  assert.ok(contrast(look.palette.accent, look.sky[0][1]) > 6, 'the ship stands out of the dark overhead');
});

test('the palette keeps the five roles and the powers told apart from each other and from the bullets', () => {
  const { enemy, alien, shot, beam, accent } = look.palette;
  const roles = Object.values(alien);
  assert.equal(Object.keys(alien).join(), 'grunt,diver,gunner,armored,carrier');
  for (let i = 0; i < roles.length; i++) for (let j = i + 1; j < roles.length; j++) assert.ok(dist(roles[i], roles[j]) > 40, `${roles[i]} and ${roles[j]} are told apart`);
  for (const c of [...roles, shot, beam, accent]) assert.ok(dist(enemy, c) >= 90, `${c} is too near the bullets' rose (${dist(enemy, c).toFixed(0)})`);
  for (const kind of [...POWERS, 'bomb', 'life']) assert.ok(look.power[kind], `a tint for ${kind}`);
});

test('the backdrop files keep the sprite rules: under 200 lines, no shadow blur, no dice, no clock', () => {
  const { names, read } = backdropFiles();
  assert.ok(names.length >= 12, `${names.length} files`);
  for (const n of names) {
    const src = read(n);
    assert.ok(src.split('\n').length < 200, `${n} is ${src.split('\n').length} lines`);
    for (const bad of ['shadowBlur', 'Math.random', 'Date.now', 'performance.now']) assert.ok(!src.includes(bad), `${n} uses ${bad}`);
  }
});
