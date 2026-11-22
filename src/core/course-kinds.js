import { WIDTH, HEIGHT } from './kinds.js';

// What more than one module of a course (world 22) reads: constants and one test. A leaf: it takes only from
// kinds.js, so course.js, course-air.js, course-ground.js and whatever the later tasks add can all take from it
// without a cycle.

export const SPAWN_Y = -80; // screen y of a thing on the tick dist reaches its `at`: just above the top edge
export const GROUND_MARGIN = -SPAWN_Y; // px below the screen a ground object may sink before it is dropped
export const CROSS_Y = 260; // screen y a crossing air craft starts at, beyond the side edge it comes from

// Is the thing (an air craft, a ground object) on the screen, where the player can see it?
export const inView = (a) => a.x >= 0 && a.x <= WIDTH && a.y >= 0 && a.y <= HEIGHT;
