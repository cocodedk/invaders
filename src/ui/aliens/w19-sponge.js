// World 19, Rubber Regatta, the armored (see w19.js): THE SPONGE, a fat sea sponge, the stopper. A lumpy, many-lobed orange body full of
// pores of every size (each a dark hole with the light caught on its lower lip), flecked all over, its arms crossed over its front;
// a grumpy face under heavy brows, half-lidded eyes and a pout; bath water dripping from its underside. On beat 1 it squishes, wider and
// lower, and the drops have fallen on. Lights: wet glints on the tops of the lobes, the eyes and the drops. Its knocked-out drawing is
// w19-sponge-dizzy.js.
import { ink, lin, rad, rgba, shade, mix, line, ellipse, circle, both, INK, MOUTH, hash, TAU, shine, eyeball, droplet } from './w19-kit.js';

// The lumpy outline: n lobes round an ellipse rx by ry about (0, cy), the same for a seed, as the current path.
export function lumps(g, rx, ry, cy, n, seed) {
  g.beginPath();
  g.moveTo(...lobeAt(rx, ry, cy, n, seed, 0, 0.92));
  for (let i = 0; i < n; i++) g.quadraticCurveTo(...lobeAt(rx, ry, cy, n, seed, i + 0.5, 1.16), ...lobeAt(rx, ry, cy, n, seed, i + 1, 0.92));
  g.closePath();
}

// A point of the lumpy outline: lobe i (a half is a lobe's crown), k of the way out.
export function lobeAt(rx, ry, cy, n, seed, i, k) {
  const a = (i / n) * TAU - Math.PI / 2;
  const r = k * (1 + (hash(seed * 17 + (Math.floor(i) % n)) - 0.5) * 0.2);
  return [Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
}

const deep = (c) => mix(c, '#3a1004', 0.78);

// Each lobe swells: a soft light on its crown and a dark crease where it meets the next, inside the clipped body.
export function swell(g, c, rx, ry, cy, n, seed) {
  for (let i = 0; i < n; i++) {
    const [x, y] = lobeAt(rx, ry, cy, n, seed, i + 0.5, 0.86);
    g.fillStyle = rad(g, x, y, 0, 13, [[0, rgba('#ffe4b8', 0.42)], [1, rgba('#ffe4b8', 0)]], x - 3, y - 4);
    g.fillRect(x - 13, y - 13, 26, 26);
    const [vx, vy] = lobeAt(rx, ry, cy, n, seed, i + 1, 0.92);
    const [ix, iy] = lobeAt(rx, ry, cy, n, seed, i + 1, 0.74);
    g.beginPath();
    g.moveTo(vx, vy);
    g.lineTo(ix, iy);
    line(g, rgba(deep(c), 0.5), 1.4);
  }
}

// Pits and pores over the clipped body, clear of the face: a fine pitting all over, then the pores, set on a jittered grid so they
// spread evenly as a sponge's do; each pore a hole in a deeper shade of the sponge with the light caught on its lower inside and a
// raised lip at its top.
export function pores(g, c, gap, rx, ry, cy, seed, skip = () => false) {
  for (let i = 0; i < 90; i++) { // the pitting
    const [x, y] = [(hash(seed + i * 3) - 0.5) * rx * 2, cy + (hash(seed + i * 3 + 1) - 0.5) * ry * 2];
    circle(g, x, y, 0.7 + hash(seed + i * 3 + 2) * 0.5);
    g.fillStyle = rgba(mix(c, '#6a2004', 0.55), 0.6);
    g.fill();
    circle(g, x + 0.3, y + 0.5, 0.4);
    g.fillStyle = rgba('#ffe0a8', 0.6);
    g.fill();
  }
  let i = 0;
  for (let y = cy - ry; y <= cy + ry; y += gap * 0.86) {
    for (let x = -rx + ((Math.round((y - cy) / gap) & 1) * gap) / 2; x <= rx; x += gap) {
      i += 1;
      const [px, py] = [x + (hash(seed * 5 + i) - 0.5) * gap * 0.5, y + (hash(seed * 5 + i + 1) - 0.5) * gap * 0.5];
      if (skip(px, py) || (px / rx) ** 2 + ((py - cy) / ry) ** 2 > 1.05) continue;
      const r = 1.5 + hash(seed * 5 + i + 2) ** 1.4 * 2.8;
      const rot = hash(seed * 5 + i + 3) * 3;
      g.beginPath();
      g.ellipse(px, py, r + 0.9, r * 0.82 + 0.9, rot, Math.PI + 0.3, TAU - 0.3);
      line(g, rgba('#ffe8c0', 0.55), 1);
      ellipse(g, px, py, r, r * 0.82, rot);
      g.fillStyle = rad(g, px, py - r * 0.3, 0, r * 1.2, [[0, mix(c, '#3a0c02', 0.7)], [0.7, mix(c, '#5a1404', 0.5)], [1, mix(c, '#8a2c06', 0.3)]]);
      g.fill();
      g.beginPath();
      g.ellipse(px, py + r * 0.08, r * 0.78, r * 0.6, rot, 0.4, Math.PI - 0.4);
      line(g, rgba('#ffcf86', 0.9), Math.max(0.7, r * 0.3));
    }
  }
}

function face(b, l, c, f) {
  for (const s of [-1, 1]) eyeball(b, l, s * 10, -6, 5, 5.4, -s * 0.2, 0.4, 0.45, c);
  both((s) => { // heavy brows of sponge, down at the middle
    b.beginPath();
    b.moveTo(s * 18, -14);
    b.quadraticCurveTo(s * 11, -16, s * 4, -10.5);
    b.quadraticCurveTo(s * 11, -12, s * 17, -10);
    b.closePath();
    ink(b, lin(b, 0, -16, 0, -10, [[0, shade(c, 0.3)], [1, shade(c, -0.3)]]), 1.6);
  });
  const k = f ? 1.25 : 1; // the pout swells as it squishes
  b.beginPath();
  b.moveTo(-6 * k, 6);
  b.quadraticCurveTo(0, 2, 6 * k, 6);
  b.quadraticCurveTo(0, 9 + k, -6 * k, 6);
  b.closePath();
  ink(b, MOUTH, 1.6);
  b.beginPath();
  b.moveTo(-4 * k, 8.6);
  b.quadraticCurveTo(0, 11 + k, 4 * k, 8.6);
  line(b, rgba('#ffd8a8', 0.6), 1);
}

function arms(b, l, c) {
  for (const s of [1, -1]) { // crossed: the right arm first, the left over it
    b.beginPath();
    b.moveTo(s * 30, 8);
    b.bezierCurveTo(s * 22, 22, s * 2, 24, -s * 14, 17);
    line(b, INK, 11);
    line(b, lin(b, 0, 12, 0, 26, [[0, shade(c, 0.25)], [1, mix(c, '#7a2a06', 0.35)]]), 7.6);
    ellipse(b, -s * 15, 17, 5, 4.4, s * 0.4);
    ink(b, shade(c, 0.1), 1.6);
    for (let i = 0; i < 3; i++) {
      ellipse(b, s * (20 - i * 11), 18 + i * 1.6, 1.2, 0.9);
      b.fillStyle = deep(c);
      b.fill();
    }
  }
  shine(l, 8, 16, 6, 1.4, -0.1, 0.3);
}

export function armored(b, l, f, c) {
  b.save();
  l.save();
  if (f) {
    for (const g of [b, l]) {
      g.translate(0, 34);
      g.scale(1.05, 0.94);
      g.translate(0, -34);
    }
  }
  for (const [x, y] of f ? [[-14, 40], [6, 44], [20, 37]] : [[-14, 37], [6, 39], [20, 41]]) droplet(b, l, x, y, 2.2);
  lumps(b, 36, 30, 2, 11, 5);
  b.fillStyle = rad(b, -8, -10, 2, 44, [[0, shade(c, 0.45)], [0.45, shade(c, 0.08)], [0.85, mix(c, '#a03c08', 0.3)], [1, mix(c, '#5a1c04', 0.5)]]);
  b.fill();
  b.save();
  lumps(b, 36, 30, 2, 11, 5);
  b.clip();
  swell(b, c, 36, 30, 2, 11, 5);
  pores(b, c, 9, 34, 28, 2, 3, (x, y) => Math.abs(x) < 19 && y > -17 && y < 11);
  b.restore();
  lumps(b, 36, 30, 2, 11, 5);
  line(b, INK, 2.8);
  face(b, l, c, f);
  arms(b, l, c);
  for (let i = 0; i < 6; i++) { // glints on the tops of the lobes
    const a = -2.6 + i * 0.42;
    shine(l, Math.cos(a) * 28, 2 + Math.sin(a) * 24, 3.2, 1.4, a + Math.PI / 2, 0.42);
  }
  l.restore();
  b.restore();
}
