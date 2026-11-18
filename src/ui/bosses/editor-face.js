// The Night Editor's face parts (World 20, Midnight Press; see editor.js): the green celluloid eyeshade (armour) over its brow, the
// great eyes (weak, painted as the left one and mirrored), with the bar-shaped pupils of an octopus in vermilion irises, and the ink
// siphon under them (weak), a wrinkled funnel with ink welling in its mouth. Each draws centred on its part's rect and covers it.
import { path, ink, lin, rad, line, rgba, ellipse, circle, TAU, PAL, glow } from './editor-kit.js';

export const SHADE_GLOW = 34; // px, the glow under the shade and at the siphon's mouth: each part's margin in editor.js
export const SIPHON_GLOW = 40;

// The eyeshade: a band of green celluloid, wider at the peak, its rim bound in ink, the lamp's light coming through it.
export function shade(b, l, p) {
  const [w, h] = [p.w, p.h];
  const peak = [[-w / 2 + 16, -h / 2], [w / 2 - 16, -h / 2], [w / 2 + 14, h / 2], [-w / 2 - 14, h / 2]];
  path(b, peak);
  ink(b, lin(b, 0, -h / 2, 0, h / 2, [[0, PAL.greenL], [0.4, PAL.green], [1, PAL.greenD]]), 4);
  b.save();
  path(b, peak);
  b.clip();
  for (let i = 0; i < 9; i++) { // the celluloid's ribs
    const x = -w / 2 + (w * (i + 0.5)) / 9;
    path(b, [[x * 0.86, -h / 2], [x * 1.1, h / 2]], true);
    line(b, rgba(PAL.greenD, 0.5), 2);
  }
  b.fillStyle = lin(b, 0, -h / 2, 0, h / 2, [[0, rgba('#ffffff', 0.2)], [0.5, rgba('#ffffff', 0)]]);
  b.fillRect(-w / 2 - 20, -h / 2, w + 40, h);
  b.restore();
  path(b, [[-w / 2 - 14, h / 2], [w / 2 + 14, h / 2]], true); // the bound edge
  line(b, PAL.ink, 7);
  line(b, PAL.greenD, 3);
  for (const s of [-1, 1]) { // the rivets at its corners
    circle(b, s * (w / 2 - 6), -h / 2 + 10, 5);
    ink(b, '#c9c4cc', 1.6);
  }
  path(l, peak);
  l.save();
  l.globalCompositeOperation = 'lighter';
  l.fillStyle = lin(l, 0, -h / 2, 0, h / 2, [[0, rgba(PAL.greenL, 0.25)], [1, rgba(PAL.green, 0.05)]]);
  l.fill();
  l.restore();
  glow(l, 0, h / 2, SHADE_GLOW, PAL.greenL, 0.18); // inside the sprite: no further down than the part's margin
  ellipse(l, -w * 0.2, -h * 0.2, w * 0.22, 5, -0.05);
  l.fillStyle = rgba('#ffffff', 0.35);
  l.fill();
}

// An eye: a great pale ball in its lid, a vermilion iris, a bar of a pupil, the lid heavy over it.
export function eye(b, l, p) {
  const [rx, ry] = [p.w / 2 + 4, p.h / 2 + 4];
  ellipse(b, 0, 0, rx + 8, ry + 6); // the lid's rim
  ink(b, PAL.skinD, 3);
  ellipse(b, 0, 2, rx, ry);
  ink(b, rad(b, 0, 2, 0, rx, [[0, PAL.paper], [0.75, PAL.paper], [1, PAL.paperD]], -rx * 0.3, -ry * 0.3), 3);
  circle(b, 6, 6, ry * 0.62);
  ink(b, rad(b, 6, 6, 0, ry * 0.62, [[0, PAL.redL], [0.6, PAL.red], [1, PAL.redD]]), 2.4);
  for (let i = 0; i < 16; i++) { // the iris's fibres
    const a = (i / 16) * TAU;
    path(b, [[6 + Math.cos(a) * ry * 0.3, 6 + Math.sin(a) * ry * 0.3], [6 + Math.cos(a) * ry * 0.58, 6 + Math.sin(a) * ry * 0.58]], true);
    line(b, rgba(PAL.redD, 0.6), 1.2);
  }
  ellipse(b, 6, 6, ry * 0.42, ry * 0.12); // an octopus's bar of a pupil
  b.fillStyle = PAL.ink;
  b.fill();
  b.save();
  ellipse(b, 0, 2, rx, ry);
  b.clip();
  b.fillStyle = lin(b, 0, -ry, 0, -ry * 0.1, [[0, PAL.skinL], [1, PAL.skin]]); // the lid, heavy with a long night
  b.fillRect(-rx, -ry - 2, rx * 2, ry * 0.75);
  b.restore();
  b.beginPath();
  b.ellipse(0, -ry * 0.3, rx * 0.98, ry * 0.16, 0, 0, Math.PI);
  line(b, PAL.ink, 2.4);
  circle(l, -4, -2, 5);
  l.fillStyle = '#ffffff';
  l.fill();
  glow(l, 6, 6, ry * 1.1, PAL.red, 0.3);
}

// The siphon: a wrinkled funnel of skin pointing down at the ship, ink welling in its vermilion-lined mouth.
export function siphon(b, l, p) {
  const [w, h] = [p.w, p.h];
  const funnel = [[-w * 0.32, -h / 2], [w * 0.32, -h / 2], [w * 0.22, h * 0.2], [w * 0.4, h / 2], [-w * 0.4, h / 2], [-w * 0.22, h * 0.2]];
  path(b, funnel);
  ink(b, lin(b, -w / 2, 0, w / 2, 0, [[0, PAL.skinL], [0.45, PAL.skin], [1, PAL.skinD]]), 3.4);
  for (let i = 0; i < 5; i++) { // its wrinkles
    const y = -h / 2 + 10 + i * 12;
    b.beginPath();
    b.moveTo(-w * 0.28, y);
    b.quadraticCurveTo(0, y + 6, w * 0.28, y);
    line(b, rgba(PAL.ink, 0.45), 1.8);
  }
  ellipse(b, 0, h / 2, w * 0.4, 12); // the mouth
  ink(b, PAL.red, 3);
  ellipse(b, 0, h / 2 + 1, w * 0.3, 8);
  b.fillStyle = rad(b, 0, h / 2, 0, w * 0.3, [[0, PAL.ink], [1, PAL.skinD]]);
  b.fill();
  for (const [x, len] of [[-14, 14], [6, 22], [20, 10]]) { // ink running over the lip
    path(b, [[x - 3, h / 2 + 6], [x + 3, h / 2 + 6], [x + 2, h / 2 + 6 + len], [x - 2, h / 2 + 6 + len]]);
    b.fillStyle = PAL.ink;
    b.fill();
    circle(l, x, h / 2 + 6 + len, 1.6);
    l.fillStyle = rgba(PAL.lamp, 0.7);
    l.fill();
  }
  l.beginPath();
  l.moveTo(-w * 0.24, -h / 2 + 6);
  l.lineTo(-w * 0.16, h * 0.16);
  line(l, rgba('#ffffff', 0.25), 4);
  glow(l, 0, h / 2, SIPHON_GLOW, PAL.red, 0.28); // inside the sprite: no further down than the part's margin
}
