import { WIDTH, HEIGHT, EPS, TICK } from './kinds.js';
import { COOLDOWN } from './ship.js';

// What more than one module of a course (world 22) reads: constants and one test. A leaf: it takes only from
// kinds.js and ship.js (the gun's cooldown), neither of which reads a course module, so course.js, course-air.js,
// course-ground.js and whatever the later tasks add can all take from it without a cycle.

export const SPAWN_Y = -80; // screen y of a thing on the tick dist reaches its `at`: just above the top edge
export const GROUND_MARGIN = -SPAWN_Y; // px below the screen a ground object may sink before it is dropped
export const CROSS_Y = 260; // screen y a crossing air craft starts at, beyond the side edge it comes from

// The data rules of a course (test/core/course-fair-kit.js checks a level's data against them) and the par, which is computed from the data:
export const BAND_MIN = 300; // px: the widest free gap between the walls, the pillars and the hedges that leave a gap is never narrower than this, at any row
export const THORN_SLACK = 24; // px: a thorn piece is at least 2 * SHIP_R + THORN_SLACK wide, so the gap one broken piece leaves lets the ship through with room to spare
export const RESPAWN_SAFE = 2; // s of scroll after a checkpoint is reached in which nothing spawns (the blinking is INVULN, 1.5 s, and ends inside it)
export const WALL_SLOPE_MAX = 1; // px a wall edge may move per px of scroll: the walls are tested at the ship's centre row, so a steeper edge hides rock from its disc (R21)
export const HOLD_PAR = 20; // s a hold adds to its leg's par: the time to break its gates (pars.js parOf)
export const END_RUN = 600; // px of scroll a leg that ends on its hold runs on past the hold's stop, about 3 s at Leg 1's 200 px/s: the scroll goes on once the gates have fallen, the ship flies into the blank land past them, and the leg clears at the end of it (a leg's length is the stop plus this)

// How long steady fire from the base gun takes to break each kind of ground object, s (the owner's first pass, 2026-11-22: the shots
// break everything on the ground now, and with auto-fire on a gate of 6-8 hp fell in about a second). A shot takes 1 hp, so a kind's
// hp is its seconds over SHOT_SECS, the time between two shots as the gun really fires them (whole ticks, ship.js shoots on the first
// tick its cooldown is within EPS of 0). Leg 1 (levels-8.js) and the defaults of course-ground.js read hpFor, so a change is one line.
export const BREAK_SECS = { stone: 0.5, turret: 1, pillar: 2, gate: 3, thorn: 0.4 };
export const SHOT_SECS = Math.ceil((COOLDOWN - EPS) / TICK) * TICK;
export const hpFor = (kind) => Math.round(BREAK_SECS[kind] / SHOT_SECS);

// The ground kinds that are a box { x, y, w, h }, (x, y) its centre: they ram the ship while they stand (course-terrain.js) and the shots reach them
// across their box (course-shots.js). A pillar is the first, a piece of a thorn hedge (Leg 2) the second.
export const BOXES = ['pillar', 'thorn'];

// Is the thing (an air craft, a ground object) on the screen, where the player can see it?
export const inView = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;
