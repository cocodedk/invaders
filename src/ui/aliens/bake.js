// The alien sprite cache. Each world's painters (w1.js .. w8.js) are run once per role and frame into
// offscreen canvases: a body, its lights (drawn additively), a white hit-flash silhouette and, on
// demand, the body cracked (stage 1 and 2). Per frame the game only blits these.
//   art(look)                         the world's module with defaults filled in: rate (frames/s),
//                                     sync (whole formation in step), bob (px), halo (alpha), crack
//   roleSprites(look, role, scale?)   { body: [f0, f1], lights: [f0, f1], flash: [f0, f1], size, scale }
//                                     (draw a canvas at size x size world px; scale > 1 is for the sheet)
//   cracked(set, frame, stage)        the body with cracks, stage 1 | 2 (baked on first use)
//   extraSprites(look, name, scale?)  the same shape for 'saucer' or 'wreck', or null if the world
//                                     has no such painter
//   warmAliens(look)                  bake a world's whole set (call when a level's view is built)
// A painter is (b, l, frame, colour): it draws centred on (0, 0) in world px into the body context
// b and the lights context l (see kit.js), colour = look.palette.alien[role] (the carrier's for
// extras). painter.size overrides the canvas edge (SIZE).
import { makeCanvas, hash } from '../sprites.js';
import { INK, rgba, path } from './kit.js';
import w1 from './w1.js';
import w2 from './w2.js';
import w3 from './w3.js';
import w4 from './w4.js';
import w5 from './w5.js';
import w6 from './w6.js';
import w7 from './w7.js';
import w8 from './w8.js';

export const SIZE = 96; // px, a sprite canvas's edge at scale 1; the alien's centre is its centre
export const ROLE_LIST = ['grunt', 'diver', 'gunner', 'armored', 'carrier'];
const ART = [w1, w2, w3, w4, w5, w6, w7, w8];
const DEFAULTS = { rate: 2, sync: false, bob: 0, halo: 0.25, crack: null };

const sets = new Map();
const arts = new Map();

export function art(look) {
  let a = arts.get(look.world);
  if (!a) {
    a = { ...DEFAULTS, ...(ART[look.world - 1] ?? ART[0]) };
    arts.set(look.world, a);
  }
  return a;
}

function canvasAt(size, scale) {
  const c = makeCanvas(size * scale, size * scale);
  const g = c.getContext('2d');
  g.translate((size * scale) / 2, (size * scale) / 2);
  g.scale(scale, scale);
  return [c, g];
}

function white(body) {
  const c = makeCanvas(body.width, body.height);
  const g = c.getContext('2d');
  g.drawImage(body, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// seed picks the crack pattern; crackColor is the world's hot line inside a crack (or null).
function bakeSet(paint, color, scale, seed, crackColor) {
  const size = paint.size ?? SIZE;
  const body = [];
  const lights = [];
  for (const f of [0, 1]) {
    const [bc, bg] = canvasAt(size, scale);
    const [lc, lg] = canvasAt(size, scale);
    paint(bg, lg, f, color);
    body.push(bc);
    lights.push(lc);
  }
  return { body, lights, flash: body.map(white), size, scale, seed, crackColor, cracks: {} };
}

function get(look, key, paint, color, scale, seed) {
  const k = `${look.world}:${key}:${scale}`;
  let s = sets.get(k);
  if (!s) {
    s = bakeSet(paint, color, scale, seed, art(look).crack);
    sets.set(k, s);
  }
  return s;
}

export function roleSprites(look, role, scale = 1) {
  const i = ROLE_LIST.indexOf(role);
  return get(look, role, art(look)[role], look.palette.alien[role], scale, i + 1);
}

export function extraSprites(look, name, scale = 1) {
  const paint = art(look)[name];
  return paint ? get(look, name, paint, look.palette.alien.carrier, scale, 9) : null;
}

// Jagged cracks from a few seeded points near the centre: a dark split with a lit lower lip.
function crackPaths(seed, stage) {
  const out = [];
  for (let k = 0; k < stage * 2; k++) {
    const h = (j) => hash(seed * 977 + k * 131 + j);
    let a = h(1) * Math.PI * 2;
    let x = Math.cos(a) * 6 * h(2);
    let y = Math.sin(a) * 6 * h(2) - 2;
    const pts = [[x, y]];
    for (let s = 0; s < 4; s++) {
      a += (h(10 + s) - 0.5) * 1.6;
      const len = 5 + h(20 + s) * 5;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    out.push(pts);
  }
  return out;
}

export function cracked(set, frame, stage) {
  const key = frame * 3 + stage;
  if (set.cracks[key]) return set.cracks[key];
  const src = set.body[frame];
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.translate(src.width / 2, src.height / 2);
  g.scale(set.scale, set.scale);
  for (const pts of crackPaths(set.seed, stage)) {
    for (const [dx, dy, c2, w] of [[0.9, 1.1, rgba('#ffffff', 0.4), 1.2], [0, 0, INK, 2.6]]) {
      g.save();
      g.translate(dx, dy);
      path(g, pts, true);
      g.lineWidth = w;
      g.strokeStyle = c2;
      g.lineJoin = 'miter';
      g.stroke();
      g.restore();
    }
    if (set.crackColor) {
      path(g, pts, true);
      g.lineWidth = 1;
      g.strokeStyle = set.crackColor;
      g.stroke();
    }
  }
  set.cracks[key] = c;
  return c;
}

export function warmAliens(look) {
  for (const role of ROLE_LIST) roleSprites(look, role);
  extraSprites(look, 'saucer');
  extraSprites(look, 'wreck');
}
