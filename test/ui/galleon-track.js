// A canvas context that follows what it is asked to draw, for checking where art lies: its transform
// (translate, scale, rotate, save and restore, which also give back globalAlpha and the composite
// operation as a real canvas does), and the extent in the space the caller set up of every path point
// and every drawImage, control points of curves included (so the extent is a little generous).
//   const { ctx, calls, bounds } = tracker();
//   calls: one per drawImage, { img, alpha, comp, args, box: [x0, y0, x1, y1] }
//   bounds: { x0, y0, x1, y1 } over everything drawn
import { sink } from './dom-kit.js';

export function tracker() {
  const calls = [];
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const o = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const apply = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const grow = (b, x, y) => {
    const [wx, wy] = apply(x, y);
    b.x0 = Math.min(b.x0, wx);
    b.y0 = Math.min(b.y0, wy);
    b.x1 = Math.max(b.x1, wx);
    b.y1 = Math.max(b.y1, wy);
  };
  const rect = (b, x, y, w, h) => [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => grow(b, px, py));
  const pts = (...a) => { for (let i = 0; i < a.length; i += 2) grow(bounds, a[i], a[i + 1]); };
  const handlers = {
    save: () => stack.push([m.slice(), o.globalAlpha, o.globalCompositeOperation]),
    restore: () => ([m, o.globalAlpha, o.globalCompositeOperation] = stack.pop()),
    translate: (x, y) => { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
    scale: (x, y) => { m = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; },
    rotate: (a) => {
      const [c, s] = [Math.cos(a), Math.sin(a)];
      m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]];
    },
    moveTo: pts,
    lineTo: pts,
    quadraticCurveTo: pts,
    bezierCurveTo: pts,
    arc: (x, y, r) => rect(bounds, x - r, y - r, r * 2, r * 2),
    ellipse: (x, y, rx, ry) => rect(bounds, x - rx, y - ry, rx * 2, ry * 2),
    rect: (x, y, w, h) => rect(bounds, x, y, w, h),
    roundRect: (x, y, w, h) => rect(bounds, x, y, w, h),
    fillRect: (x, y, w, h) => rect(bounds, x, y, w, h),
    strokeRect: (x, y, w, h) => rect(bounds, x, y, w, h),
    drawImage(img, ...a) {
      const [dx, dy, dw, dh] = a.length >= 8 ? a.slice(4, 8) : [a[0], a[1], a[2] ?? img.width, a[3] ?? img.height];
      const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      rect(box, dx, dy, dw, dh);
      rect(bounds, dx, dy, dw, dh);
      calls.push({ img, alpha: o.globalAlpha, comp: o.globalCompositeOperation, args: a, box: [box.x0, box.y0, box.x1, box.y1] });
    },
  };
  const ctx = new Proxy(o, {
    get: (t, k) => (k in handlers ? handlers[k] : k in t ? t[k] : () => sink),
    set: (t, k, v) => ((t[k] = v), true),
  });
  return { ctx, calls, bounds };
}
