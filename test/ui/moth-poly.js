// A path made into a polygon, for checking where art lies against other art without pixels: a context that follows
// moveTo, lineTo, quadraticCurveTo, bezierCurveTo and closePath and flattens the curves into short segments, then
// `inside` (a point in a polygon) and `contains` (every point of one polygon inside another, to a slack in px).
//   const pts = polygon((g) => outline(g));   // [[x, y], ...]
export function polygon(build, steps = 14) {
  const pts = [];
  let cur = [0, 0];
  const ctx = {
    beginPath() {},
    closePath() {},
    moveTo(x, y) { cur = [x, y]; pts.push(cur); },
    lineTo(x, y) { cur = [x, y]; pts.push(cur); },
    quadraticCurveTo(cx, cy, x, y) {
      const [x0, y0] = cur;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y]);
      }
      cur = [x, y];
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      const [x0, y0] = cur;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        pts.push([u ** 3 * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * x, u ** 3 * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * y]);
      }
      cur = [x, y];
    },
  };
  build(ctx);
  return pts;
}

export function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// How far `pt` is from the polygon's edge, in px (the least distance to a segment).
export function edgeDistance(pt, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const [dx, dy] = [bx - ax, by - ay];
    const t = Math.max(0, Math.min(1, ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(pt[0] - ax - dx * t, pt[1] - ay - dy * t));
  }
  return best;
}

// Every point of `a` is inside `b`, or within `slack` px of its edge: the polygon `b` holds `a`.
export const contains = (b, a, slack = 0) => a.filter((p) => !inside(p, b) && edgeDistance(p, b) > slack);
