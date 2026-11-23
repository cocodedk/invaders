import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom, all, textOf, has } from './lobby-kit.js';
import { recorder } from './dom-kit.js';

// World 22 is a course: one level with no waves and no boss. Before it joins the game, the screens that read a world's
// waves or boss are held to a stand-in for it: a level with `course` data and a `waves` that throws when read, and a
// real world with its boss taken away. (lobby-nav.test.js and posters.test.js hold the grid keys and the poster's level.)
installDom();
const { cardOf } = await import('../../src/ui/screens/lobby-card.js');
const { createFlow } = await import('../../src/ui/flow.js');
const { drawHud } = await import('../../src/ui/hud.js');
const { LOOKS } = await import('../../src/ui/looks/index.js');
const { createWorld } = await import('../../src/core/world.js');
const { LEVELS, WORLDS, levelById } = await import('../../src/core/levels.js');
const { bossDef } = await import('../../src/core/bosses-data.js');
const { warmPosters, posterFor, prefer, posterLevel } = await import('../../src/ui/screens/posters.js');

const part = (el, cls) => all(el).filter((e) => has(e, cls));

test('the card of a world with no boss has no "Featuring" line and still shows its poster, name, tagline and reels', () => {
  const world = WORLDS[0];
  const bare = cardOf({ ...world, boss: undefined }, {}, () => {}).el;
  assert.equal(part(bare, 'poster-bill').length, 0);
  assert.ok(!/Featuring|false|undefined/.test(textOf(bare)), textOf(bare));
  assert.equal(textOf(part(bare, 'poster-name')[0]), world.name);
  assert.equal(part(bare, 'poster-tag').length, 1);
  assert.equal(part(bare, 'reel').length, LEVELS.filter((l) => l.world === world.id).length);
  const billed = cardOf(world, {}, () => {}).el;
  assert.equal(textOf(part(billed, 'poster-bill')[0]), `Featuring ${bossDef(world.boss).name}`, 'a world with a boss is billed as before');
});

// The course's HUD panel: its leg and its lanterns lit of those it holds (the checkpoints in its spawns).
const SPAWNS = [
  { kind: 'air', at: 100 }, { kind: 'checkpoint', at: 400 }, { kind: 'turret', at: 600 },
  { kind: 'checkpoint', at: 900 }, { kind: 'crate', at: 1200 }, { kind: 'checkpoint', at: 1500 },
];
const LANTERNS = SPAWNS.filter((e) => e.kind === 'checkpoint').length;
const LEG = 3;

const courseLevel = () => ({ id: 'course-test', world: 1, index: LEG, seed: 1, course: { speed: 100, length: 2000, spawns: SPAWNS } });

// The HUD must not even look: its level's `waves` throws when read.
function strictLevel() {
  const level = courseLevel();
  Object.defineProperty(level, 'waves', { get() { throw new Error('a course has no waves'); } });
  return level;
}

function courseWorld(lit) {
  const world = createWorld(levelById('w1-1'));
  return Object.assign(world, { level: strictLevel(), course: { lit } });
}

const hudTexts = (world) => {
  const { ctx, calls } = recorder();
  drawHud(ctx, world, LOOKS[0], {}, 0);
  return calls.filter(([k]) => k === 'fillText').map((c) => c[1]);
};

test('the HUD draws a course world without reading its waves: the leg and the lanterns lit of all', () => {
  for (const lit of [0, 1, LANTERNS]) {
    const texts = hudTexts(courseWorld(lit));
    assert.ok(texts.includes(`LEG ${LEG}`), texts.join());
    assert.ok(texts.includes(`${lit} / ${LANTERNS}`), texts.join());
    assert.ok(!texts.some((t) => t.startsWith('WAVE')), 'no wave counter');
  }
});

test('the HUD of a wave level still counts its waves', () => {
  const level = levelById('w1-1');
  const texts = hudTexts(createWorld(level));
  assert.ok(texts.includes(`WAVE 1 / ${level.waves.length}`), texts.join());
  assert.ok(!texts.some((t) => t.startsWith('LEG')), 'no leg');
});

// The failed card reads how far the run got from the world (flow.js progress).
const failedProgress = (world) => {
  let screen = null;
  const r = { app: {}, labelOf: () => 'World · Reel', goLobby() {}, startLevel() {}, startTry() {} };
  createFlow(r, { show: (s) => (screen = s) }).showFailed({ level: world.level, mode: 'play', score: 1200, session: { world } });
  return textOf(part(screen.el, 'result-best')[0]);
};

test('the failed card reads a level without waves, and still says how far a wave level got', () => {
  const level = levelById('w1-1');
  assert.equal(failedProgress({ boss: null, wave: 2, level }), `Wave 2 of ${level.waves.length}`);
  assert.doesNotThrow(() => failedProgress({ boss: null, wave: 0, level: courseLevel(), course: { lit: 1 } }));
  assert.ok(failedProgress({ boss: null, wave: 0, level: courseLevel(), course: { lit: 1 } }).length > 0, 'it still says something');
});

// Run last: it takes world 1's boss level out of LEVELS for the bake, so that world has none.
test('a poster is baked for a world with no boss level, from its last level', () => {
  const at = LEVELS.findIndex((l) => l.world === 1 && l.boss);
  const [boss] = LEVELS.splice(at, 1);
  const queue = [];
  globalThis.requestIdleCallback = (fn) => queue.push(fn); // the baker's slices, run here one at a time
  try {
    assert.equal(posterLevel(1).id, LEVELS.filter((l) => l.world === 1).at(-1).id);
    prefer([1]);
    warmPosters(() => true);
    for (let i = 0; i < 100 && !posterFor(1); i++) queue.shift()();
    assert.equal(posterFor(1)?.className, 'poster-canvas', 'baked without a boss to draw or to centre on');
  } finally {
    LEVELS.splice(at, 0, boss);
  }
});
