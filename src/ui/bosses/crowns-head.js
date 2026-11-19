// The Ten-Crowned King's heads (World 21, Golden Isle; see crowns.js). Each is a painted mask (aliens/w21-kit.js) in the deep green of the
// dance-drama, red eyes burning, under a stepped crown of gold: the great head at the centre the largest, under four tiers, roaring;
// the one above it and the four fanned out to each side smaller, leaning out along the fan, some roaring and some cold, every one
// looking toward the middle, its jewelled collar under its chin (all but the head above the great one's). A fallen head leaves its
// empty jewelled collar, capped with smouldering ember. Lights: the eyes, the gold, the coal.
import { path, ink, lin, rad, line, rgba, shade, mix, ellipse, circle, both, GOLD, GOLD_D, BLACK, gilt, glint, petals, mask, PAL, skin,
  glow, neckOf } from './crowns-kit.js';
import { collar, collarDrop } from './crowns-robe.js';

// How each head is painted: its scale, how far below the box's centre its face sits, its crown's tiers and height, roaring or not.
const LOOK = {
  headT: { s: 1.25, y: 4, tiers: 3, crownH: 30, mood: 0 },
  head: { s: 2.2, y: 18, tiers: 4, crownH: 26, mood: 1 },
  headL1: { s: 1.35, y: 12, tiers: 3, crownH: 30, mood: 0 },
  headL2: { s: 1.35, y: 12, tiers: 3, crownH: 30, mood: 1 },
  headL3: { s: 1.35, y: 12, tiers: 3, crownH: 30, mood: 0 },
  headL4: { s: 1.35, y: 12, tiers: 3, crownH: 30, mood: 1 },
};
const lookOf = (id) => LOOK[id] ?? LOOK[id.replace('R', 'L')];

// A head at its box's centre (p: its part). It leans out along the fan by its distance from the middle.
export function head(b, l, p) {
  const k = lookOf(p.id);
  const lean = Math.sign(p.dx) * Math.min(0.16, Math.abs(p.dx) / 2400);
  const [nx, ny, nw] = neckOf(p.id);
  const cy = ny - p.dy;
  if (p.id !== 'headT') collar(b, l, 0, cy + collarDrop(p.id), nw); // its jewelled collar over the mantle, riding with the head
  path(b, [[-nw / 2, cy + p.h * 0.25], [nw / 2, cy + p.h * 0.25], [nw * 0.4, cy - 4], [-nw * 0.4, cy - 4]]); // the top of the neck
  b.fillStyle = skin(b, -nw / 2, cy - 4, nw / 2, cy + p.h * 0.25);
  b.fill();
  for (const g of [b, l]) {
    g.save();
    g.rotate(lean);
  }
  both((q) => { // heavy gold earrings, a red jewel in each
    const [ex, ey, er] = [q * 20 * k.s, k.y + 7 * k.s, 4.2 * k.s];
    circle(b, ex, ey, er);
    ink(b, gilt(b, ex - er, ey - er, ex + er, ey + er), 1.4);
    circle(b, ex, ey, er * 0.45);
    b.fillStyle = rgba(PAL.red, 0.9);
    b.fill();
    glint(l, ex - er * 0.3, ey - er * 0.4, Math.max(1.6, er * 0.35), 0.45);
  });
  mask(b, l, 0, k.y, k.s, PAL.green, { tiers: k.tiers, crownH: k.crownH, mood: k.mood, look: -Math.sign(p.dx) * 0.7 });
  b.restore();
  l.restore();
  glow(l, 0, k.y - 4 * k.s, 18 * k.s, PAL.red, 0.12);
}

// A fallen head: its empty jewelled collar on the short neck, capped by a smooth dome of ember, smouldering a dull red.
export function stump(b, l, p) {
  const [, ny, nw] = neckOf(p.id);
  const cy = ny - p.dy;
  path(b, [[-nw * 0.5, cy + p.h * 0.25], [nw * 0.5, cy + p.h * 0.25], [nw * 0.44, cy], [-nw * 0.44, cy]]); // the neck
  ink(b, skin(b, -nw / 2, cy, nw / 2, cy + p.h * 0.25), 2.2);
  b.beginPath(); // the ember cap
  b.ellipse(0, cy - 2, nw * 0.46, nw * 0.4, 0, Math.PI, 0);
  b.closePath();
  ink(b, rad(b, -nw * 0.12, cy - nw * 0.2, 1, nw * 0.5, [[0, mix(PAL.ember, PAL.red, 0.5)], [0.55, mix(PAL.red, BLACK, 0.35)], [1, '#1c0607']]), 2);
  collar(b, l, 0, cy + 1, nw); // the empty collar
  petals(b, 0, cy + 6, nw * 0.4, 7, GOLD, 0.2, Math.PI - 0.2, 0.8);
  glow(l, 0, cy - nw * 0.18, nw * 0.6, PAL.red, 0.3);
  glow(l, -nw * 0.1, cy - nw * 0.22, nw * 0.22, PAL.ember, 0.35);
  glint(l, -nw * 0.4, cy, 2.2, 0.35);
}
