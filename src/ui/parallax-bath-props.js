// The things on Rubber Regatta's shelf skyline (parallax-bath-shelf.js), each standing on `base` at layer x: a glass bottle (rose,
// amber or mint, its liquid at a level, a highlight down one side, a cork or a brass cap and no label), a jar (wide, bath salts in it,
// a ridged brass lid), a loofah standing like a cactus (a trunk and two arms, ribbed, its mesh pitted) and a toy lighthouse (red and
// cream bands, a door, a gallery and a lit lantern room under a red dome; its lamp goes in out.lights).
import { rgba, lin, shade, roundRect, hash } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';
import { brass } from './parallax-bath-kit.js';

const glassFill = (g, x, w, c) => lin(g, x - w / 2, 0, x + w / 2, 0, [[0, shade(c, -0.45)], [0.22, shade(c, -0.05)], [0.42, shade(c, 0.2)], [0.8, shade(c, -0.15)], [1, shade(c, -0.5)]]);

function bottlePath(g, x, base, w, h, round) {
  const [nw, sh, nk] = [w * 0.34, base - h * (round ? 0.42 : 0.62), base - h * 0.82];
  g.beginPath();
  g.moveTo(x - w / 2, base - 8);
  g.lineTo(x - w / 2, sh);
  g.bezierCurveTo(x - w / 2, sh - (sh - nk) * (round ? 0.9 : 0.5), x - nw / 2, nk + 6, x - nw / 2, nk);
  g.lineTo(x - nw / 2, base - h + 10);
  g.lineTo(x + nw / 2, base - h + 10);
  g.lineTo(x + nw / 2, nk);
  g.bezierCurveTo(x + nw / 2, nk + 6, x + w / 2, sh - (sh - nk) * (round ? 0.9 : 0.5), x + w / 2, sh);
  g.lineTo(x + w / 2, base - 8);
  g.quadraticCurveTo(x + w / 2, base, x + w / 2 - 8, base);
  g.lineTo(x - w / 2 + 8, base);
  g.quadraticCurveTo(x - w / 2, base, x - w / 2, base - 8);
  g.closePath();
}

export function bottle(g, x, base, o) {
  const c = PAL.bottle[o.color];
  bottlePath(g, x, base, o.w, o.h, o.round);
  g.fillStyle = glassFill(g, x, o.w, c);
  g.fill();
  g.save();
  g.clip();
  const level = base - o.h * (0.3 + 0.25 * (hash(x) + 0.4));
  g.fillStyle = rgba(shade(c, -0.32), 0.6); // the liquid and its bright surface
  g.fillRect(x - o.w, level, o.w * 2, base - level);
  g.fillStyle = rgba(shade(c, 0.45), 0.8);
  g.fillRect(x - o.w, level, o.w * 2, 2);
  g.fillStyle = rgba('#ffffff', 0.42); // the highlight down one side, and a glint on the shoulder
  g.fillRect(x - o.w * 0.3, base - o.h * 0.58, Math.max(3, o.w * 0.1), o.h * 0.48);
  g.fillRect(x - o.w * 0.12, base - o.h * 0.8, 3, o.h * 0.1);
  g.restore();
  g.strokeStyle = rgba(shade(c, -0.65), 0.85);
  g.lineWidth = 1.6;
  g.stroke();
  const [cw, top] = [o.w * 0.34 + 4, base - o.h];
  if (o.cap === 'cork') {
    g.fillStyle = lin(g, x - cw / 2, 0, x + cw / 2, 0, [[0, shade(PAL.cork, -0.3)], [0.4, shade(PAL.cork, 0.1)], [1, shade(PAL.cork, -0.35)]]);
    roundRect(g, x - cw / 2 + 1, top - 6, cw - 2, 20, 3);
    g.fill();
    g.fillStyle = rgba(shade(PAL.cork, -0.5), 0.6);
    for (let i = 0; i < 6; i++) g.fillRect(x - cw / 2 + 3 + hash(x + i) * (cw - 7), top - 3 + hash(x + i + 9) * 14, 2, 2);
  } else {
    g.fillStyle = brass(g, x - cw / 2, x + cw / 2);
    roundRect(g, x - cw / 2, top - 4, cw, 17, 3);
    g.fill();
    g.fillStyle = rgba(PAL.brass.dark, 0.55);
    for (let ry = top; ry < top + 12; ry += 4) g.fillRect(x - cw / 2, ry, cw, 1.2);
  }
}

export function jar(g, x, base, o) {
  const c = PAL.bottle[o.color];
  const [w, h] = [o.w, o.h];
  roundRect(g, x - w / 2, base - h, w, h, 14);
  g.fillStyle = glassFill(g, x, w, c);
  g.fill();
  g.save();
  g.clip();
  g.fillStyle = rgba(shade(c, 0.5), 0.85); // bath salts
  for (let i = 0; i < 46; i++) g.fillRect(x - w / 2 + 4 + hash(x * 3 + i) * (w - 8), base - h * 0.7 * hash(x * 3 + i + 99), 3, 3);
  g.fillStyle = rgba('#ffffff', 0.42);
  g.fillRect(x - w * 0.34, base - h + 12, 5, h - 24);
  g.restore();
  g.strokeStyle = rgba(shade(c, -0.65), 0.85);
  g.lineWidth = 1.6;
  g.stroke();
  g.fillStyle = brass(g, x - w / 2 - 3, x + w / 2 + 3);
  roundRect(g, x - w / 2 - 3, base - h - 14, w + 6, 18, 5);
  g.fill();
  g.fillStyle = rgba(PAL.brass.dark, 0.5);
  for (let rx = x - w / 2 + 2; rx < x + w / 2; rx += 6) g.fillRect(rx, base - h - 12, 1.5, 14);
}

export function loofah(g, x, base, o, rng) {
  const [h, tw] = [o.h, 46];
  const parts = [
    [x - tw / 2, base - h, tw, h, tw / 2], // the trunk
    [x - tw / 2 - 40, base - h * 0.5, 50, 24, 12], [x - tw / 2 - 40, base - h * 0.82, 24, h * 0.32 + 24, 12], // the left arm
    [x + tw / 2 - 8, base - h * 0.62, 46, 22, 11], [x + tw / 2 + 16, base - h * 0.9, 22, h * 0.28 + 22, 11], // the right arm
  ];
  g.fillStyle = lin(g, x - tw / 2 - 40, 0, x + tw / 2 + 40, 0, [[0, shade(PAL.loofah, -0.25)], [0.4, shade(PAL.loofah, 0.12)], [1, shade(PAL.loofah, -0.35)]]);
  for (const p of parts) {
    roundRect(g, ...p);
    g.fill();
  }
  g.fillStyle = rgba(shade(PAL.loofah, -0.5), 0.5); // the mesh, pitted all over
  for (let i = 0; i < 220; i++) {
    const p = parts[i % parts.length];
    g.fillRect(p[0] + 3 + rng() * (p[2] - 6), p[1] + 4 + rng() * (p[3] - 8), 1.5 + rng() * 2.5, 1.2 + rng() * 1.5);
  }
  g.strokeStyle = rgba(shade(PAL.loofah, -0.45), 0.55); // ribs down the trunk
  g.lineWidth = 1.5;
  for (const f of [-0.3, 0, 0.3]) {
    g.beginPath();
    g.moveTo(x + f * tw, base - h + 10);
    g.lineTo(x + f * tw * 1.1, base);
    g.stroke();
  }
}

export function lighthouse(g, x, base, o, rng, out) {
  const [b0, b1] = [34, 22];
  const top = base - o.h + 54; // the gallery's floor
  g.save();
  g.beginPath();
  g.moveTo(x - b0, base);
  g.lineTo(x - b1, top);
  g.lineTo(x + b1, top);
  g.lineTo(x + b0, base);
  g.closePath();
  g.clip();
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? PAL.cream : PAL.red;
    g.fillRect(x - b0, top + ((base - top) * i) / 5, b0 * 2, (base - top) / 5 + 1);
  }
  g.fillStyle = lin(g, x - b0, 0, x + b0, 0, [[0, rgba('#000000', 0.32)], [0.38, rgba('#ffffff', 0.2)], [0.6, rgba('#ffffff', 0)], [1, rgba('#000000', 0.4)]]);
  g.fillRect(x - b0, top, b0 * 2, base - top);
  g.restore();
  g.fillStyle = PAL.ink;
  roundRect(g, x - 8, base - 26, 16, 26, 7);
  g.fill();
  g.fillRect(x - 4, top + 26, 8, 10);
  g.fillRect(x - 4, top + 62, 8, 10);
  g.fillRect(x - b1 - 10, top - 6, (b1 + 10) * 2, 6); // the gallery
  g.fillStyle = PAL.lamp; // the lantern room
  g.fillRect(x - 16, top - 34, 32, 28);
  g.fillStyle = PAL.ink;
  for (const mx of [-16, -6, 4, 14]) g.fillRect(x + mx, top - 34, 2, 28);
  g.fillStyle = PAL.red;
  g.beginPath();
  g.arc(x, top - 34, 19, Math.PI, 0);
  g.fill();
  g.fillStyle = PAL.ink;
  g.beginPath();
  g.arc(x, top - 55, 4, 0, TAU);
  g.fill();
  out.lights.push({ x, y: top - 20, r: 70, color: PAL.lamp, mode: 'pulse', ph: rng(), a: 0.3 });
}
