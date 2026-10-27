// Small numeric helpers shared by core, fx and ui. Points are plain `{ x, y }` objects.
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

// Smoothstep (flat at both ends) and a cubic ease-out, both of a 0..1 progress, clamped.
export const smooth = (x) => {
  const v = clamp(x, 0, 1);
  return v * v * (3 - 2 * v);
};
export const easeOut = (x) => 1 - (1 - clamp(x, 0, 1)) ** 3;

// An angle folded into -PI..PI.
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Move `v` toward `target` by at most `step` without overshooting.
export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

// Squared distance between two points (compare against r * r, no sqrt).
export const dist2 = (a, b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2;

// Angle in radians from `a` to `b`; 0 is +x, and +y points down the screen.
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// Squared distance from the point (px, py) to the segment (ax, ay)-(bx, by).
export function segDist2(ax, ay, bx, by, px, py) {
  const ex = bx - ax;
  const ey = by - ay;
  const len2 = ex * ex + ey * ey;
  const u = len2 ? clamp(((px - ax) * ex + (py - ay) * ey) / len2, 0, 1) : 0;
  return (ax + ex * u - px) ** 2 + (ay + ey * u - py) ** 2;
}

// Squared distance from `at` to the path `p` flew in the last `dt` (from where its velocity says it was).
export const sweepDist2 = (p, dt, at) => segDist2(p.x - p.vx * dt, p.y - p.vy * dt, p.x, p.y, at.x, at.y);

// Like sweepDist2, but `at` moved too: it went from `from` to where it is while `p` flew its path, both
// at a steady pace. What counts is the gap between them, which is itself a straight path, so this is the
// distance from `at` to `p` at their closest in that time (R68: the ship may cross far in one tick).
// Without `from`, `at` stood still and this is sweepDist2.
export const sweepRel2 = (p, dt, at, from = at) =>
  segDist2(p.x - p.vx * dt - from.x, p.y - p.vy * dt - from.y, p.x - at.x, p.y - at.y, 0, 0);

const side = (ax, ay, bx, by, px, py) => Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));

// Squared distance between the segments (ax, ay)-(bx, by) and (cx, cy)-(dx, dy): 0 when they cross,
// else the least of the four endpoint-to-segment distances. A segment of no length is a point.
export function segSegDist2(ax, ay, bx, by, cx, cy, dx, dy) {
  const crossing = side(ax, ay, bx, by, cx, cy) * side(ax, ay, bx, by, dx, dy) < 0
    && side(cx, cy, dx, dy, ax, ay) * side(cx, cy, dx, dy, bx, by) < 0;
  if (crossing) return 0;
  return Math.min(segDist2(ax, ay, bx, by, cx, cy), segDist2(ax, ay, bx, by, dx, dy),
    segDist2(cx, cy, dx, dy, ax, ay), segDist2(cx, cy, dx, dy, bx, by));
}

// Squared distance from the segment (ax, ay)-(bx, by) to the box of width w and height h centred on
// (cx, cy): 0 when it touches or crosses it. The distance to a box is convex along any line, so a
// ternary search closes in on the nearest point (forty rounds leave it far under a hundredth of a px).
export function segBoxDist2(ax, ay, bx, by, cx, cy, w, h) {
  const at = (u) => {
    const dx = Math.max(Math.abs(ax + (bx - ax) * u - cx) - w / 2, 0);
    const dy = Math.max(Math.abs(ay + (by - ay) * u - cy) - h / 2, 0);
    return dx * dx + dy * dy;
  };
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (at(m1) < at(m2)) hi = m2;
    else lo = m1;
  }
  return Math.min(at((lo + hi) / 2), at(0), at(1));
}
