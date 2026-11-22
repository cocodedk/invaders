// Shared by the course tests (world 22): a test-only course level, which createWorld takes as it takes the
// tests' other own levels. `data` is the level's `course`: { speed, length, starts, walls, spawns }.
export const courseLevel = (data) =>
  ({ id: 'test-course', world: 22, index: 1, seed: 1, d: 0.5, twist: 'journey', free: true, bunkers: false, course: data });
