// Small numeric helpers shared by core, fx and ui. Points are plain `{ x, y }` objects.
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Move `v` toward `target` by at most `step` without overshooting.
export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

// Squared distance between two points (compare against r * r, no sqrt).
export const dist2 = (a, b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2;

// Angle in radians from `a` to `b`; 0 is +x, and +y points down the screen.
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
