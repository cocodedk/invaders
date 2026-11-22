// The lobby's posters, drawn by the game itself: each world's boss level (a world without a boss: its last level) is run
// a few seconds with the autopilot and one frame of it is rendered (sky, parallax, boss, ship, effects; no HUD), then
// cropped to a 2:3 poster round the boss (the field's middle when there is none). Kept for the session (no image files).
// A bake comes in eight slices (the run-up, the world's alien sprites, its boss, worlds 15, 16 and 17's own sprites,
// the view, the frame), one per idle period while the title or the lobby is up, so no single frame carries a whole poster
// and nothing is baked while a level plays. A run-up of more than RUNUP_SLICE ticks (a course's: world 22's is 87 s of flight) is
// itself cut into slices of that many ticks.
//   warmPosters(allowed)   start baking in idle slices; allowed() says whether now is a menu
//   prefer(worlds)         bake these worlds' posters next (the ones in view); the rest follow in order
//   preferred() -> worlds  what prefer last said
//   posterFor(world) -> canvas | null      TAGLINES[world - 1]: each world's line      reelName(level)
//   posterLevel(world, levels = LEVELS) -> level   the level a world's poster is taken from
import { LEVELS, WORLDS } from '../../core/levels.js';
import { createWorld, stepWorld } from '../../core/world.js';
import { autopilot } from '../../core/autopilot.js';
import { TICK } from '../../core/kinds.js';
import { fxRng } from '../session.js';
import { createFx, stepFx } from '../../fx/fx.js';
import { applyEvents } from '../../fx/react.js';
import { lookFor } from '../looks/index.js';
import { warmAliens } from '../aliens/bake.js';
import { bossArt } from '../bosses/bake.js';
import { warmDeep } from '../warm-deep.js';
import { warmGlass } from '../warm-glass.js';
import { warmBreath } from '../warm-breath.js';
import { createView, drawFrame } from '../view.js';
import { makeCanvas, W } from '../sprites.js';
import { clamp } from '../../core/math.js';

export const TAGLINES = [
  'Where it all began.',
  'The city never sleeps. Neither do they.',
  'Two suns. One way out.',
  'Steel beneath the blossoms.',
  'They hatch in the dark.',
  'The signal has teeth.',
  'The machines woke first.',
  'Even light bends here.',
  'The tide brings it home.',
  'Midnight keeps its guests.',
  'The sky burns cold.',
  'Every star is a story.',
  'The wind is on our side.',
  'One spark is all it takes.',
  'Never follow the light.',
  'Every color cuts.',
  'Take back every breath.',
  'Make their fire follow you.',
  'Bath time. Bring a bat.',
  'Every shot goes to print twice.',
  'Every arrow comes home.',
  'Colour follows the light.',
];

const FRAME_W = 768;
const FRAME_H = 432;
// s into each boss fight: in place, mid-attack; a course (world 22) has no boss, so it is s into the flight, the autopilot flying
// it. The autopilot knows nothing of walls: it loses all its lives on stretch 1's narrowing twice and starts the leg over, so the
// moment is found by running it, not by reading the data: the first pass of stretch 2, the ship alive and not blinking, and a live
// craft, a turret and a crate inside the poster's crop (x 660-1260, y 0-900). Find it again after any change to Leg 1's data.
const AT = [3.6, 3.4, 3.6, 3.4, 3.4, 3.4, 3.4, 3.8, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 3.6, 87.4];
const LIT = 0.4; // s of effects before the frame (muzzle flashes, sparks); the run-up before has none
export const RUNUP_SLICE = 600; // ticks of the run-up an idle period steps at most: 10 s of play, a few ms on a desktop and still a slice on a Pi
const CROP_W = 600; // the crop, in world px: a 2:3 window over the top of the field, centred on the boss
const CROP_H = 900;
const posters = new Map();

export const posterFor = (world) => posters.get(world) ?? null;

export function posterLevel(world, levels = LEVELS) {
  const ofWorld = levels.filter((l) => l.world === world);
  return ofWorld.find((l) => l.boss) ?? ofWorld.at(-1);
}

// The run-up: `secs` of the world flown by the autopilot, the effects (fx, drawn on rng) of the last LIT s kept. Every RUNUP_SLICE ticks it
// hands the idle period back, so a long run-up (a course's) never fills a frame.
export function* runUp(w, fx, rng, secs) {
  const n = Math.round(secs / TICK);
  const lit = n - Math.round(LIT / TICK);
  for (let i = 0; i < n; i++) {
    stepWorld(w, TICK, autopilot(w));
    const events = w.events.splice(0);
    if (i >= lit) {
      applyEvents(fx, events, rng, w);
      stepFx(fx, TICK);
    }
    if ((i + 1) % RUNUP_SLICE === 0 && i + 1 < n) yield; // not at the end: bake yields there itself
  }
}

function* bake(world) {
  const level = posterLevel(world);
  const look = lookFor(level);
  const secs = AT[world - 1];
  const w = createWorld(level, level.seed);
  const fx = createFx();
  const rng = fxRng(level.seed);
  yield* runUp(w, fx, rng, secs);
  yield;
  warmAliens(look);
  yield;
  if (level.boss) bossArt(look, level.boss); // drawn whole: none of the fight's damage art (warmBoss)
  yield;
  warmDeep(look); // Lantern Deep's caustics, maelstrom and sway are heavy to bake: not in the frame's slice
  yield;
  warmGlass(look); // so are the Glass Cathedral's light and glass: a slice of their own
  yield;
  warmBreath(look); // and world 17's smog, ash and breath sprites: a slice of their own (a no-op elsewhere)
  yield;
  const frame = makeCanvas(FRAME_W, FRAME_H);
  const view = createView(frame, level, false); // sky and parallax; the sprites above are already baked
  view.showHud = false;
  yield;
  drawFrame(view, w, fx, secs);
  const { s: k, ox, oy } = view.fit;
  const x0 = clamp((w.boss?.x ?? W / 2) - CROP_W / 2, 0, W - CROP_W);
  const out = makeCanvas(CROP_W * k, CROP_H * k);
  out.getContext('2d').drawImage(frame, ox + x0 * k, oy, CROP_W * k, CROP_H * k, 0, 0, out.width, out.height);
  out.className = 'poster-canvas';
  posters.set(world, out);
}

// The lobby puts every world on one scrolling page, so it says which worlds are in view (prefer) and the
// baker takes those first, in the order given, then the rest in world order. A poster half baked is
// always finished first: the choice is made only between posters.
let wanted = [];
export const prefer = (worlds) => { wanted = worlds; };
export const preferred = () => wanted; // what prefer last said (the tests read it back)

let current = null;
function bakeStep() {
  if (!current) {
    const world = wanted.find((id) => !posters.has(id)) ?? WORLDS.find((wd) => !posters.has(wd.id))?.id;
    if (!world) return false;
    current = bake(world);
  }
  if (current.next().done) current = null;
  return true;
}

// requestIdleCallback posted from inside an idle callback runs in the next idle period: at most one
// slice per frame. The timeout (at least two slices a second) keeps the posters coming on a machine that
// is rarely idle.
const idle = (fn) => (globalThis.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 50));

let warming = false;
export function warmPosters(allowed) {
  if (warming) return;
  warming = true;
  const slot = () => {
    if (!allowed()) setTimeout(() => idle(slot), 500); // a level is up: look again later
    else if (bakeStep()) idle(slot);
  };
  idle(slot);
}
