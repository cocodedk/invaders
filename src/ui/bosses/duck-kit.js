// What The Dowager Duck's painters share (World 19, Rubber Regatta; bosses/duck*.js): her colours, the parts' rects (read from the core's data,
// so the art follows the hit boxes) and every rubber, outline and highlight helper she needs; none is borrowed from the alien kits of world 19,
// which are drawn apart. Coordinates are boss-local: the origin is her centre, x right, y down. Nothing but the bobble may be drawn above y = TOP,
// the HUD's edge at the top of her orbit (she rests at 330 and rises 55 in it; the HUD band ends at 96; duck-form.test.js flies it).
//   PAL    the look's three boss colours (looks/w19.js palette.boss: yellow rubber, coral armour, orange weak points) and her own: the cap's rose,
//          cream, the foam, the plaster, the eyes
//   PART   { [id]: { x, y, w, h } } the parts' rects (centre and size) from bossDef('duck')
//   rng(seed)                  a seeded stream in [0, 1): the same duck every bake
//   bloom(l, x, y, r, c, a)    an additive bloom whose radius is held under TOP, so that it fades out before the HUD's line
//   blob(g, pts)               a closed outline as the current path
//   rubber(g, pts, c, o)       an outline filled as moulded rubber, lit from the upper left, a warm shade low on the right, an INK outline
//   shine(l, x, y, rx, ry, a, rot)  a soft gloss on the lights layer (additive white: the rubber's sheen)
//   glint(b, x, y, rx, ry, a, rot)  a hard white catch-light on the body
//   inked(g, w)                stroke the current path in INK, w px
//   pane(b, x, y, w, h, a, k)  the bathroom's sash window reflected in glossy rubber: three lites over three, white, leaning by k and
//                              fading away from the light
//   drop(g, x, y, r, c)        a drop of bathwater beading on rubber of colour c: its shadow, a clear body, a rim and a catch-light
// Bake-time only, but for the cached sprites of the live pass (duck-sprites.js), made once.
import look from '../looks/w19.js';
import { bossDef } from '../../core/bosses-data.js';
import { hash, INK, mix } from '../sprites.js';
import { path, line, lin, rad, rgba, shade, ellipse, TAU } from './kit.js';
import { circle } from '../aliens/kit.js';

export { hash, path, line, lin, rad, rgba, shade, mix, ellipse, circle, TAU };

export const TOP = -179; // no art above this y but the bobble's: HUD_BOTTOM (96) less the top of her orbit (330 - 55)
const { hull, plate, weak } = look.palette.boss;
export const PAL = {
  yellow: hull, yellowL: shade(hull, 0.55), yellowD: mix(hull, '#e0620c', 0.5), yellowDD: mix(hull, '#a8400a', 0.62),
  coral: plate, coralD: mix(plate, '#a01830', 0.45), orange: weak, orangeL: shade(weak, 0.4), orangeD: mix(weak, '#8a2a06', 0.5),
  rose: '#ff86b0', roseD: '#d24d82', roseL: '#ffc4da', cream: '#fff4e2', creamD: '#f0d7b8',
  foam: '#fdfaf2', foamD: '#cfc6dc', foamDD: '#a99fbe', plaster: '#f4c39a', plasterD: '#c98c62',
  eye: '#ffffff', pupil: '#1c1020', mouth: '#7a1c1c', tongue: '#ff6f86', blush: '#ff6a7a',
};

export const PART = Object.fromEntries(bossDef('duck').parts.map((p) => [p.id, { x: p.dx, y: p.dy, w: p.w, h: p.h }]));

export const rng = (seed) => {
  let i = 0;
  return () => hash(seed * 7919 + i++);
};

export function bloom(l, x, y, r0, c, a) {
  const r = Math.min(r0, y - TOP); // a bloom that would reach the HUD's line is made smaller, so that it has faded out before it
  if (r <= 1) return;
  l.save();
  l.globalCompositeOperation = 'lighter';
  l.fillStyle = rad(l, x, y, 0, r, [[0, rgba(c, a)], [0.25, rgba(c, a * 0.5)], [0.6, rgba(c, a * 0.14)], [1, rgba(c, 0)]]);
  l.fillRect(x - r, y - r, r * 2, r * 2);
  l.restore();
}

export const blob = (g, pts) => path(g, pts);
export const inked = (g, w = 4) => line(g, INK, w);

const box = (pts) => {
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

// Moulded rubber: a radial fill whose bright focus sits up and to the left (lx, ly in half-widths), the colour round it and a warm
// shade at the far edge; then the INK outline (lw 0: none).
// rubberFill is that fill for a box centred on (cx, cy), hw x hh half-size: a piece laid over another (the belly over the body) takes the
// fill of the one under it, so that the two read as one moulding.
export function rubberFill(g, cx, cy, hw, hh, c, { lx = -0.4, ly = -0.5, dark = mix(c, '#c0400c', 0.42), light = shade(c, 0.42), spread = 1.12 } = {}) {
  return rad(g, cx, cy, 0, Math.max(hw, hh) * spread, [[0, light], [0.5, c], [0.86, c], [1, dark]], cx + lx * hw, cy + ly * hh);
}

export function rubber(g, pts, c, o = {}) {
  const [x0, y0, x1, y1] = box(pts);
  blob(g, pts);
  g.fillStyle = rubberFill(g, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, c, o);
  g.fill();
  if (o.lw ?? 4) inked(g, o.lw ?? 4);
}

function oval(g, x, y, rx, ry, rot, fill) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(rx, ry);
  g.fillStyle = fill(g);
  circle(g, 0, 0, 1);
  g.fill();
  g.restore();
}

export function shine(l, x, y, rx, ry, a = 0.6, rot = 0) {
  l.save();
  l.globalCompositeOperation = 'lighter';
  oval(l, x, y, rx, ry, rot, (g) => rad(g, 0, 0, 0, 1, [[0, rgba('#ffffff', a)], [0.55, rgba('#ffffff', a * 0.45)], [1, rgba('#ffffff', 0)]]));
  l.restore();
}

// The window's reflection: w x h about (x, y), its top leant k * h to the right, as the curve of the rubber bends it; the lites fade toward the
// lower right, away from the light, and the lower sash's are taller.
export function pane(b, x, y, w, h, a = 0.8, k = 0.25) {
  const bar = Math.max(1.4, w * 0.06);
  const qw = (w - bar * 2) / 3;
  const rows = [[y - h / 2, h * 0.42 - bar / 2], [y - h / 2 + h * 0.42 + bar / 2, h * 0.58 - bar / 2]];
  const lean = (yy) => -k * (yy - y);
  rows.forEach(([y0, qh], j) => {
    for (let i = 0; i < 3; i++) {
      const x0 = x - w / 2 + i * (qw + bar);
      path(b, [[x0 + lean(y0), y0], [x0 + qw + lean(y0), y0], [x0 + qw + lean(y0 + qh), y0 + qh], [x0 + lean(y0 + qh), y0 + qh]]);
      b.fillStyle = rgba('#ffffff', a * (1 - 0.2 * i - 0.25 * j));
      b.fill();
    }
  });
}

export function drop(g, x, y, r, c) {
  const dark = mix(c, '#5a1a00', 0.55);
  ellipse(g, x + r * 0.3, y + r * 0.45, r, r * 0.85);
  g.fillStyle = rgba(dark, 0.3);
  g.fill();
  circle(g, x, y, r);
  g.fillStyle = rad(g, x, y, 0, r, [[0, rgba('#ffffff', 0.1)], [0.7, rgba(shade(c, 0.5), 0.4)], [1, rgba(dark, 0.55)]], x + r * 0.3, y + r * 0.4);
  g.fill();
  circle(g, x - r * 0.36, y - r * 0.36, r * 0.32);
  g.fillStyle = rgba('#ffffff', 0.95);
  g.fill();
  circle(g, x + r * 0.34, y + r * 0.44, r * 0.14);
  g.fillStyle = rgba('#ffffff', 0.6);
  g.fill();
}

export function glint(b, x, y, rx, ry, a = 0.9, rot = 0) {
  oval(b, x, y, rx, ry, rot, (g) => rad(g, 0, 0, 0, 1, [[0, rgba('#ffffff', a)], [0.7, rgba('#ffffff', a * 0.85)], [1, rgba('#ffffff', 0)]]));
}
