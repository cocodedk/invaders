// The constants of a course (world 22) that more than one of its modules reads. A leaf: it imports nothing, so
// course.js, course-air.js and whatever the later tasks add can all take from it without a cycle.

export const SPAWN_Y = -80; // screen y of a thing on the tick dist reaches its `at`: just above the top edge
export const GROUND_MARGIN = -SPAWN_Y; // px below the screen a ground object may sink before it is dropped
export const CROSS_Y = 260; // screen y a crossing air craft starts at, beyond the side edge it comes from
