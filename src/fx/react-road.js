// World 22's events (Wanderlight) told as pencil and watercolour on parchment. On the pale parchment an additive flash or ring is a white blob
// (react-ground.js says so), so none is used here: colour is carried by soft opaque puffs and solid chips, plain shapes and no glow. Every count
// goes through emit.js's `count`, so fx.density thins them. Pure: randomness comes from `rng`, `world` is only read.
//   checkpoint   a lantern is lit (core 'checkpoint', at the lantern): warm gold puffs rise from it and a few gold chips jump
//   ability      the ship's gift (wraps STORY.ability's caption, react-story.js): gold puffs rise around the ship; the event has no place of its own
//   seedBurst    a seed bursts (at its x, y over its burst radius r): the paint's own colours puff out over the burst, with chips
//   chip         a bullet struck and flying on: a few violet flecks (the colour of what hurts here)
//   cut          a bullet broken (world 22 only; wraps world's cut, react-world.js): violet chips and a puff of violet, a crack drawn
//   respawn      the ship set down again at the checkpoint: gold puffs rise
//   holdBreak    the Grey Gate falls and colour floods the valley: soft blobs of every paint colour swell over the whole field and fade, and
//                chips of colour fall out of them. The core washes the sky clean on the same tick (course-hold.js washAway), so nothing is
//                drawn where the craft and the bullets were: the flood covers them
import { addParticle } from './particles.js';
import { count, debris } from './emit.js';
import { STORY } from './react-story.js';
import { WORLD } from './react-world.js';
import { between, pick } from '../core/rng.js';
import { WIDTH, HEIGHT } from '../core/kinds.js';
import { LAND_WOOD } from '../core/levels-8-kit.js';

export const ROAD_WORLD = 22; // the renderer's WANDER_WORLD (ui/wander-kit.js; react-road.test.js keeps the two alike)
// The colours, copied from ui/wander-kit.js PAL (react-road.test.js keeps them alike): the lantern's golds, what hurts, and the paint the valley floods with.
export const GOLDS = ['#e9b949', '#c8901f', '#ffe9a8'];
export const VIOLETS = ['#7a5cc4', '#2e2250'];
export const WOOD_PAINTS = ['#3f7d3a', '#a6d672', '#5a6fd6', '#c3de92', '#b4d9a0']; // Leg 2's: canopy greens, bluebell, clearing (PAL; react-road.test.js keeps them alike)
export const PAINTS = ['#a9cf74', '#3fa7a5', '#d8c35a', '#4f8f45', '#bee68c', '#e0533a', '#e9b949', '#4fc3c0'];

export const GLOW = { checkpoint: 8, ability: 6, respawn: 8, chips: 6, spread: 26, size: 24, rise: 90 }; // gold puffs of each (counts), gold chips of a checkpoint, and the puffs' spread, radius (px) and rise (px/s)
export const SEED = { puffs: 12, chips: 8, size: 24, chipSpeed: 220, chipSize: [3, 6] };
export const FLECKS = { chip: 3, cut: 8, speed: 180, cutSpeed: 320, size: [2, 5], puffs: 2 }; // violet chips of a struck and a broken bullet, their speeds (px/s at most) and sizes (px radius)
export const FLOOD = { spots: 14, puffs: 5, chips: 3, spread: 240, size: [40, 70], grow: 90, life: [1.4, 2.4], chipSpeed: 420, chipSize: [4, 9] }; // a spot is a place, spread over the field, where puffs and chips come from

// k soft puffs of `colors` over a radius of `spread` px around (x, y), each starting at `size` and swelling, rising at `rise` px/s (0 drifts).
function puffs(fx, rng, x, y, k, colors, { spread, size, rise = 0, grow = size, life = [0.9, 1.5] }) {
  for (let i = 0, m = count(fx, k); i < m; i++) {
    addParticle(fx, {
      x: x + between(rng, -spread, spread), y: y + between(rng, -spread, spread), vx: between(rng, -30, 30), vy: -rise * between(rng, 0.5, 1),
      life: between(rng, life[0], life[1]), size, grow, color: pick(rng, colors), kind: 'smoke', drag: 1.2,
    });
  }
}

const lit = (fx, rng, x, y, k) => puffs(fx, rng, x, y, k, GOLDS, { spread: GLOW.spread, size: GLOW.size, rise: GLOW.rise });

function checkpoint(fx, ev, rng) {
  lit(fx, rng, ev.x, ev.y, GLOW.checkpoint);
  debris(fx, rng, ev.x, ev.y, GLOW.chips, GOLDS, SEED.chipSpeed, SEED.chipSize);
}

const abilityFor = (caption) => (fx, ev, rng, world) => {
  caption(fx, ev, rng, world);
  if (world?.ship) lit(fx, rng, world.ship.x, world.ship.y, GLOW.ability);
};

const paintsOf = (fx) => (fx.land === LAND_WOOD ? WOOD_PAINTS : PAINTS); // the land the session's leg learned (react-story.js openLeg)

function seedBurst(fx, ev, rng) {
  const paints = paintsOf(fx);
  puffs(fx, rng, ev.x, ev.y, SEED.puffs, paints, { spread: ev.r ?? 0, size: SEED.size });
  debris(fx, rng, ev.x, ev.y, SEED.chips, paints, SEED.chipSpeed, SEED.chipSize);
}

function chip(fx, ev, rng) {
  debris(fx, rng, ev.x, ev.y, FLECKS.chip, VIOLETS, FLECKS.speed, FLECKS.size);
}

function snap(fx, ev, rng) {
  debris(fx, rng, ev.x, ev.y, FLECKS.cut, VIOLETS, FLECKS.cutSpeed, FLECKS.size);
  puffs(fx, rng, ev.x, ev.y, FLECKS.puffs, VIOLETS, { spread: GLOW.spread / 2, size: GLOW.size / 2 });
}

const cutFor = (usual) => (fx, ev, rng, world) => (world?.level?.world === ROAD_WORLD ? snap(fx, ev, rng) : usual(fx, ev, rng, world));

function respawn(fx, ev, rng) {
  lit(fx, rng, ev.x, ev.y, GLOW.respawn);
}

function holdBreak(fx, ev, rng) {
  const paints = paintsOf(fx);
  for (let i = 0; i < FLOOD.spots; i++) {
    const [x, y] = [between(rng, 0, WIDTH), between(rng, 0, HEIGHT)];
    puffs(fx, rng, x, y, FLOOD.puffs, paints, { spread: FLOOD.spread, size: between(rng, FLOOD.size[0], FLOOD.size[1]), grow: FLOOD.grow, life: FLOOD.life });
    debris(fx, rng, x, y, FLOOD.chips, paints, FLOOD.chipSpeed, FLOOD.chipSize);
  }
}

export const ROAD = { checkpoint, ability: abilityFor(STORY.ability), seedBurst, chip, cut: cutFor(WORLD.cut), respawn, holdBreak };
