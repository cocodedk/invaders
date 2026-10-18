// One event carrying every field any core event has, so a reaction or a sound reads a number wherever it
// looks. A new core field gets added here, once. `over` overrides, e.g. { kind: 'queen' }.
export const sampleEvent = (type, over = {}) => ({
  type, tick: 1, x: 500, y: 300, side: 'ship', power: null, pattern: 'aimed', role: 'grunt', mult: 3, size: 2,
  on: true, kind: 'spread', lives: 2, wind: 120, strength: 0.8, dir: 1, warn: 0.7, phase: 1, open: ['core'], last: false, nth: 0,
  ...over,
});
