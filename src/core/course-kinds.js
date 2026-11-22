import { WIDTH, HEIGHT } from './kinds.js';

// What more than one module of a course (world 22) reads: constants and one test. A leaf: it takes only from
// kinds.js, so course.js, course-air.js, course-ground.js and whatever the later tasks add can all take from it
// without a cycle.

export const SPAWN_Y = -80; // screen y of a thing on the tick dist reaches its `at`: just above the top edge
export const GROUND_MARGIN = -SPAWN_Y; // px below the screen a ground object may sink before it is dropped
export const CROSS_Y = 260; // screen y a crossing air craft starts at, beyond the side edge it comes from

// The data rules of a course (test/core/course-fair-kit.js checks a level's data against them) and the par, which is computed from the data:
export const BAND_MIN = 300; // px: the widest free gap between the walls and the pillars is never narrower than this, at any row
export const RESPAWN_SAFE = 2; // s of scroll after a checkpoint is reached in which nothing spawns (the blinking is INVULN, 1.5 s, and ends inside it)
export const WALL_SLOPE_MAX = 1; // px a wall edge may move per px of scroll: the walls are tested at the ship's centre row, so a steeper edge hides rock from its disc (R21)
export const HOLD_PAR = 20; // s a hold adds to its leg's par: the time to break its gates (pars.js parOf)

// Is the thing (an air craft, a ground object) on the screen, where the player can see it?
export const inView = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;
