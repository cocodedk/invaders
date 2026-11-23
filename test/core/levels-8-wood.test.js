import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY } from '../../src/core/levels-8.js';
import { LEVELS, WORLDS, levelById, reelName } from '../../src/core/levels.js';
import { difficulty } from '../../src/core/difficulty.js';
import { INTRO, TICK, WIDTH } from '../../src/core/kinds.js';
import { FREE_ZONE } from '../../src/core/ship.js';
import { createWorld, stepWorld } from '../../src/core/world.js';
import { MAX_BULLETS } from '../../src/core/aliens.js';
import { hpFor, inView, SPAWN_Y, END_RUN, RESPAWN_SAFE } from '../../src/core/course-kinds.js';
import { RESPAWN_Y } from '../../src/core/course-check.js';
import { stopAt, GATE_DY_MAX, HOLD_FLIGHTS_MAX } from '../../src/core/course-hold.js';
import { parOf } from '../../src/core/pars.js';
import { unfair } from './course-fair-kit.js';
import { closingHedges, openThorns } from './course-fair-wood.js';
import { flyCourse, CLEAR_PARS } from './course-clear-kit.js';
import { IDLE } from './world-kit.js';

// World 22's Leg 2 (the Pencil Wood), proven on its own, as levels-8.test.js proves Leg 1: its shape (two lanterns, the first granting the line,
// Smudges before and after it, thorn hedges that leave a way round and ones that close the band, an end hold), the data rules, a clear, and
// the two facts only a flown course shows: nothing else is in the air while a hedge that must be shot through scrolls in, and the hold never
// loses a flight to a full sky. The data is read through LEVELS, never from a test kit.
const WORLD = WORLDS.length;
const leg = levelById('w22-2');
const one = levelById('w22-1');
const kinds = (kind) => leg.course.spawns.filter((e) => e.kind === kind);
const smudges = (spawns) => spawns.filter((e) => e.kind === 'air' && e.path === 'hang');
const lantern = () => kinds('checkpoint')[0];
const hold = () => leg.course.spawns.at(-1);
const widths = ({ walls }) => walls.map(([, left, right]) => right - left).filter((w) => w < WIDTH); // the keyframes that close in on the band
const reached = (e) => e.at + RESPAWN_Y - SPAWN_Y; // the dist at which a lantern is reached (its row comes down to the respawn line)

// The leg flown with an idle ship nothing can hurt (it never fires, so no craft or shot is broken): every craft lives its whole path, which is the
// worst case for what is in the air. It stops when the hold has stood for `HOLD_OBSERVE` of its periods (an idle ship never breaks it).
// Returns { seen: how many ticks each closing hedge, by its `at`, was between the top of the screen and the top of the free zone, crowded: the ticks of
// those on which an air craft was in view, peakBullets, peakAir: the most craft alive at once while the hold stood }.
const HOLD_OBSERVE = 4;
function idleFlight() {
  const world = createWorld(leg);
  const shut = closingHedges(leg.course).map((h) => h[0].at);
  const seen = new Map(shut.map((at) => [at, 0]));
  const out = { seen, crowded: 0, peakBullets: 0, peakAir: 0 };
  const limit = (leg.course.length / leg.course.speed + HOLD_OBSERVE * hold().period + INTRO + 30) / TICK;
  let heldFor = 0;
  for (let i = 0; i < limit && heldFor < HOLD_OBSERVE * hold().period; i++) {
    world.ship.invuln = Infinity;
    stepWorld(world, TICK, IDLE);
    const incoming = world.course.ground.some((g) => g.kind === 'thorn' && g.hp > 0 && shut.includes(g.at) && g.y >= 0 && g.y <= FREE_ZONE.y0);
    if (incoming) {
      for (const g of world.course.ground) if (g.kind === 'thorn' && shut.includes(g.at) && g.y >= 0 && g.y <= FREE_ZONE.y0) seen.set(g.at, seen.get(g.at) + 1);
      if (world.aliens.some((a) => a.hp > 0 && inView(a))) out.crowded++;
    }
    out.peakBullets = Math.max(out.peakBullets, world.bullets.length);
    if (world.course.held) {
      heldFor = world.course.held.t;
      out.peakAir = Math.max(out.peakAir, world.aliens.filter((a) => a.mode === 'path' && a.hp > 0).length);
    }
  }
  return out;
}

test('levels-8.js has two legs and the second is world 22\'s w22-2: a course named Leg 2, free flight, with the level data of its journey', () => {
  assert.equal(JOURNEY[0].length, 2);
  assert.equal(leg.world, WORLD);
  assert.equal(leg.index, 2);
  assert.equal(leg.course, JOURNEY[0][1].course);
  assert.equal(leg.free, true);
  assert.ok(!('waves' in leg) && !('boss' in leg));
  assert.equal(reelName(leg), 'Leg 2');
  assert.ok(parOf(leg) > 0, 'its par is computed from its data');
  assert.ok(Number.isInteger(leg.seed));
  assert.ok(LEVELS.filter((l) => l !== leg).every((l) => l.seed !== leg.seed), 'its seed is its own');
});

test('Leg 2 starts with the seed, its first lantern grants the line and the second nothing, and it ends on its hold', () => {
  assert.deepEqual(leg.course.starts, ['seed']);
  assert.equal(kinds('checkpoint').length, 2);
  assert.equal(lantern().grants, 'line');
  assert.equal(kinds('checkpoint')[1].grants, null);
  assert.equal(hold(), kinds('hold').at(-1), 'the leg ends on a hold');
  assert.equal(leg.course.length, stopAt(hold()) + END_RUN);
});

test('Leg 2 is the leg after Leg 1: about the same two minutes of scroll, a faster scroll, narrower walls, and its own difficulty above Leg 1\'s', () => {
  const secs = leg.course.length / leg.course.speed;
  assert.ok(leg.course.speed > one.course.speed);
  assert.ok(Math.abs(secs - one.course.length / one.course.speed) <= 30, `${secs.toFixed(0)} s of scroll`);
  assert.ok(Math.min(...widths(leg.course)) < Math.min(...widths(one.course)), 'its narrowest band is narrower than the gorge');
  assert.ok(Math.max(...widths(leg.course)) < Math.max(...widths(one.course)), 'its widest closed band is narrower than the valley');
  assert.ok(difficulty(WORLD, 2) > difficulty(WORLD, 1) && difficulty(WORLD, 2) <= 1);
  assert.equal(leg.d, difficulty(WORLD, 2));
});

test('Leg 2 breaks no data rule (the kit\'s, the curtain rule and the hedge rules included)', () => {
  assert.deepEqual(unfair(leg), []);
});

test('the Smudges: one or more before the line, two or more after, the first after it comes up once the line is held, and the hold has one or two', () => {
  const [before, after] = [leg.course.spawns.filter((e) => e.at < lantern().at), leg.course.spawns.filter((e) => e.at > lantern().at)];
  assert.ok(smudges(before).length >= 1, 'a Smudge before the line');
  assert.ok(smudges(after).length >= 2, 'two after it');
  assert.ok(smudges(after)[0].at >= reached(lantern()) + leg.course.speed * RESPAWN_SAFE, 'the first after the line comes up well after the lantern is reached, so the line is held when it hangs');
  const flights = hold().flights.filter((f) => f.path === 'hang');
  assert.ok(flights.length >= 1 && flights.length <= 2, `${flights.length} Smudges in the hold`);
  assert.ok(hold().flights.some((f) => f.path !== 'hang'), 'kites come with them');
});

test('thorn hedges: some leave a way round and one or more close the band', () => {
  assert.ok(openThorns(leg.course).length > 0, 'a hedge to weave through');
  assert.ok(closingHedges(leg.course).length >= 1, 'a hedge to shoot through');
});

test('the hedges that close the band stand at least a shoot window apart, and none shares a row with a pillar (the kit judges each on its own)', () => {
  const rows = closingHedges(leg.course).map((h) => [Math.min(...h.map((p) => p.at - p.h / 2)), Math.max(...h.map((p) => p.at + p.h / 2))]).sort((a, b) => a[0] - b[0]);
  const window = FREE_ZONE.y0; // px of scroll a hedge takes to come from the top of the screen to the free zone (the kit's window, in s, times the speed)
  rows.slice(1).forEach(([top], i) => assert.ok(top - rows[i][1] >= window, `hedges at ${rows[i]} and ${top}`));
  for (const p of kinds('pillar')) for (const [top, bottom] of rows) assert.ok(p.at + p.h / 2 < top || p.at - p.h / 2 > bottom, `the pillar at ${p.at} shares a row with a hedge`);
});

test('the hold is the Grey Thicket: its gates all stand as long under fire, its highest within reach, and it has turrets and crates before it', () => {
  const { targets } = hold();
  assert.ok(targets.length > 0 && targets.every((t) => t.hp === hpFor('gate')));
  assert.ok(Math.max(...targets.map((t) => t.dy)) <= GATE_DY_MAX);
  assert.ok(kinds('turret').length > 0 && kinds('crate').length > 0 && kinds('turret').every((e) => e.hp === hpFor('turret')));
});

test('Leg 2 can be cleared: a steered, unhittable flight reaches the end of its hold within its pars', () => {
  const { world, held } = flyCourse(leg);
  assert.equal(world.state, 'cleared');
  assert.ok(held, 'the scroll stopped at the hold');
  assert.ok(world.t - INTRO <= CLEAR_PARS * parOf(leg), `cleared at ${world.t.toFixed(1)} s`);
});

test('an idle flight has no air craft in view on any tick a hedge that closes the band is between the top of the screen and the free zone', () => {
  const flown = idleFlight();
  for (const [at, ticks] of flown.seen) assert.ok(ticks > 0, `the hedge at ${at} was seen in its window`);
  assert.equal(flown.crowded, 0, `${flown.crowded} ticks with a craft in view while a closing hedge came in`);
});

test('an idle flight never fills the field: the hold loses no flight to a full sky and no curtain to the bullet cap', () => {
  const flown = idleFlight();
  assert.ok(flown.peakAir > 0 && flown.peakAir < HOLD_FLIGHTS_MAX, `${flown.peakAir} craft at once while the hold stood`);
  assert.ok(flown.peakBullets < MAX_BULLETS / 2, `${flown.peakBullets} bullets at once`);
});
