// What World 19's painters share (w19.js .. w19-*.js): the invaders of the bathhouse are bath toys, moulded rubber, soap, sea sponge and
// folded paper, lit from the upper left by a sunny window. Rubber is glossy: a bright crown, the colour, and a warm deep shade (never
// grey, never violet: the enemy's soap blobs are the room's one purple); every toy wears a dark outline so it reads on the green tile
// and on the pale waterline alike, and has a comic face. What a light layer carries here is wet shine: glints, a gloss that catches the
// window, the iridescent rim of a bubble. Nothing is tin or clockwork. Nothing is painted per frame: every shape is baked.
import { path, ink, lin, rad, rgba, shade, mix, gloss, line, ellipse, circle, both, TAU, INK } from './kit.js';
import { hash } from '../sprites.js';
import { tidy, lerp, bez } from './w16-kit.js';

export { path, ink, lin, rad, rgba, shade, mix, gloss, line, ellipse, circle, both, TAU, INK, hash, tidy, lerp, bez };

export const FOAM = '#fbf8ee'; // a soap bubble's white
export const FOAM_D = '#c9dccd'; // foam in its own shadow, a soft minty grey
export const BILL = '#ff8a1e';
export const BILL_D = '#b8480a';
export const PUPIL = '#140c0a';
export const BLUSH = '#ff8f86';
export const TONGUE = '#ff6f7a';
export const MOUTH = '#6a1a1c';
export const STAR = '#ffe45a'; // the little stars of a knock-out
export const SHEEN = ['#ffc6e2', '#cce6ff', '#fff2a8', '#d4ffc4']; // a bubble's rim: rose, ice, butter, mint (no lilac: that is the grape's)

// Glossy rubber across a body centred near (cx, cy) of radius r: a bright crown at the upper left, the colour, a warm deep shade.
export const rubber = (g, cx, cy, r, c) => rad(g, cx, cy, r * 0.05, r, [
  [0, shade(c, 0.62)], [0.28, shade(c, 0.12)], [0.62, c], [0.86, mix(c, '#7a2e08', 0.34)], [1, mix(c, '#3a1206', 0.58)],
], cx - r * 0.42, cy - r * 0.46);

// A wet shine on the lights layer: a soft white oval and a hard little glint at its upper left.
export function shine(l, x, y, rx, ry, rot = 0, a = 0.5) {
  gloss(l, x, y, rx, ry, a, rot);
  ellipse(l, x - rx * 0.3, y - ry * 0.3, Math.max(0.8, rx * 0.22), Math.max(0.6, ry * 0.2), rot);
  l.fillStyle = rgba('#ffffff', Math.min(1, a * 1.7));
  l.fill();
}

// A cartoon eye: a white with an ink rim, a pupil looking toward (dx, dy) (-1..1), a glint on the lights layer. lid (0..1) closes it
// from the top in the toy's colour c.
export function eyeball(b, l, x, y, rx, ry, dx = 0, dy = 0, lid = 0, c = '#ffffff') {
  ellipse(b, x, y, rx, ry);
  ink(b, rad(b, x, y, 0, Math.max(rx, ry), [[0, '#ffffff'], [0.75, '#f6f2ea'], [1, '#d8d2c6']], x - rx * 0.3, y - ry * 0.4), 1.8);
  const [px, py, pr] = [x + dx * rx * 0.42, y + dy * ry * 0.42, Math.min(rx, ry) * 0.55];
  circle(b, px, py, pr);
  b.fillStyle = PUPIL;
  b.fill();
  if (lid > 0) {
    b.save();
    ellipse(b, x, y, rx, ry);
    b.clip();
    b.fillStyle = lin(b, 0, y - ry, 0, y - ry + ry * 2 * lid, [[0, shade(c, 0.2)], [1, mix(c, '#5a2a08', 0.3)]]);
    b.fillRect(x - rx - 1, y - ry - 1, rx * 2 + 2, ry * 2 * lid + 1);
    b.restore();
    b.beginPath();
    b.ellipse(x, y - ry + ry * 2 * lid, rx * 0.98, ry * 0.18, 0, 0, Math.PI);
    line(b, INK, 1.4);
  }
  if (l) {
    circle(l, px - pr * 0.38, py - pr * 0.42, pr * 0.34);
    l.fillStyle = '#ffffff';
    l.fill();
  }
}

// Two eyes gone cross-eyed, each pupil turned toward the other, the left a touch bigger than the right: the dizzy face.
export function crossEyes(g, x, y, gap, r) {
  for (const [s, k] of [[-1, 1.08], [1, 0.92]]) {
    const ex = x + (s * gap) / 2;
    ellipse(g, ex, y, r * k, r * k * 1.08);
    ink(g, '#ffffff', 1.8);
    circle(g, ex - s * r * k * 0.42, y + r * 0.12, r * k * 0.46);
    g.fillStyle = PUPIL;
    g.fill();
    circle(g, ex - s * r * k * 0.52, y - r * 0.08, r * k * 0.14);
    g.fillStyle = '#ffffff';
    g.fill();
  }
}

// A tongue lolling out of a mouth at (x, y), w wide, hanging dy, tipped by tilt.
export function tongue(g, x, y, w, dy, tilt = 0) {
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.bezierCurveTo(x - w / 2, y + dy, x + w / 2 + tilt, y + dy * 1.1, x + w / 2, y);
  g.closePath();
  ink(g, lin(g, 0, y, 0, y + dy, [[0, shade(TONGUE, -0.25)], [1, TONGUE]]), 1.5);
  g.beginPath();
  g.moveTo(x + tilt * 0.3, y + 1);
  g.lineTo(x + tilt * 0.5, y + dy * 0.6);
  line(g, rgba(MOUTH, 0.6), 0.9);
}

// A bead of water clinging to a toy: a clear drop, darker at its lower edge, with a glint on the lights layer.
export function droplet(b, l, x, y, r) {
  ellipse(b, x, y, r, r * 1.15);
  b.fillStyle = rad(b, x, y, 0, r * 1.15, [[0, rgba('#ffffff', 0.1)], [0.7, rgba('#ffffff', 0.25)], [1, rgba('#203040', 0.4)]], x - r * 0.3, y - r * 0.4);
  b.fill();
  b.beginPath();
  b.ellipse(x, y, r, r * 1.15, 0, 0.3, Math.PI - 0.3);
  line(b, rgba(INK, 0.45), 0.8);
  if (l) {
    circle(l, x - r * 0.35, y - r * 0.4, r * 0.32);
    l.fillStyle = rgba('#ffffff', 0.95);
    l.fill();
  }
}

// One soap bubble: a clear middle, a thin rim in a sheen colour (on the lights layer when there is one), a window glint.
export function bubble(b, l, x, y, r, seed = 0) {
  circle(b, x, y, r);
  b.fillStyle = rad(b, x, y, 0, r, [[0, rgba('#ffffff', 0.08)], [0.75, rgba('#ffffff', 0.2)], [1, rgba('#ffffff', 0.55)]]);
  b.fill();
  line(b, rgba(INK, 0.55), Math.max(0.7, r * 0.12));
  const tint = SHEEN[Math.floor(hash(seed * 7 + 3) * SHEEN.length)];
  const g = l ?? b;
  g.beginPath();
  g.arc(x, y, r * 0.8, 0.3, 2.2);
  line(g, rgba(tint, 0.85), Math.max(0.6, r * 0.18));
  g.beginPath();
  g.arc(x - r * 0.35, y - r * 0.38, r * 0.24, 0, TAU);
  g.fillStyle = rgba('#ffffff', 0.9);
  g.fill();
}

// A collar of foam: n suds in an elliptical band about (cx, cy), w across and h deep, the biggest in the middle, the same for a seed.
export function suds(b, l, cx, cy, w, h, n, seed) {
  const at = [];
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n;
    const x = cx + (k - 0.5) * w + (hash(seed * 31 + i) - 0.5) * 4;
    const y = cy + (hash(seed * 31 + i + 9) - 0.5) * h;
    const r = 3 + Math.sin(k * Math.PI) * 4.5 + hash(seed * 31 + i + 5) * 2;
    at.push([x, y, r, i]);
  }
  at.sort((p, q) => p[1] - q[1]);
  for (const [x, y, r, i] of at) {
    circle(b, x, y, r);
    b.fillStyle = rad(b, x, y, 0, r, [[0, FOAM], [0.7, shade(FOAM_D, 0.45)], [1, FOAM_D]], x - r * 0.35, y - r * 0.45);
    b.fill();
    line(b, rgba(INK, 0.5), 0.9);
    if (l && i % 3 === 0) {
      l.beginPath();
      l.arc(x, y, r * 0.75, 3.6, 5.4);
      line(l, rgba(SHEEN[i % SHEEN.length], 0.7), 0.9);
    }
  }
}

// A five-point star at (x, y), outer radius r, as the current path.
export function star5(g, x, y, r, rot = 0) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  g.closePath();
}

// A rosy cheek: a soft blush disc.
export function blush(g, x, y, rx, ry) {
  g.save();
  g.translate(x, y);
  g.scale(rx, ry);
  g.fillStyle = rad(g, 0, 0, 0, 1, [[0, rgba(BLUSH, 0.75)], [1, rgba(BLUSH, 0)]]);
  g.beginPath();
  g.arc(0, 0, 1, 0, TAU);
  g.fill();
  g.restore();
}

// The moulding seam a rubber toy keeps along its outline: a light line with a dark one under it, along pts.
export function seam(g, pts) {
  path(g, pts, true);
  line(g, rgba('#ffffff', 0.32), 1.1);
  g.save();
  g.translate(0.6, 0.8);
  path(g, pts, true);
  line(g, rgba('#3a1606', 0.26), 0.8);
  g.restore();
}
