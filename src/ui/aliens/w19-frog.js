// World 19, Rubber Regatta, the gunner (see w19.js): THE SQUIRT FROG, a lime rubber squirt toy sitting front-on on a pad of suds. A
// fat pear of a body with its pale belly, folded thighs and webbed feet, little splayed hands, darker spots, two eyes on bumps on top of
// its head, a wide grin with the round squirt nozzle in the middle of it, and the cheeks it puffs before a shot: small on beat 0, blown
// up into two glossy balloons on beat 1, with a drop of water swelling at the nozzle. Lime, so it reads on the green tile. Lights: the
// wet shine, the eyes' glints, the drop, the beads and the suds' rims. Its knocked-out drawing is w19-frog-dizzy.js.
import { ink, lin, rgba, shade, mix, line, ellipse, circle, both, INK, MOUTH, hash, rubber, shine, eyeball, droplet, suds, blush } from './w19-kit.js';

export const BELLY = '#f4f0b0';
export const spotOf = (c) => mix(c, '#2a4a08', 0.5);

// Outlined shapes that merge into one: every outline first, then every fill over them, so only the outside edge stays inked.
export function merged(g, shapes, fill, lw = 2.6) {
  for (const s of shapes) {
    s(g);
    line(g, INK, lw * 2);
  }
  for (const s of shapes) {
    s(g);
    g.fillStyle = fill;
    g.fill();
  }
}

export function webFoot(g, x, y, s, k, c) {
  const tips = [0, 1, 2].map((i) => {
    const a = s * (0.25 + i * 0.5);
    return [x + Math.sin(a) * 11 * k, y + Math.cos(a) * 6 * k];
  });
  g.beginPath();
  g.moveTo(x, y - 3 * k);
  for (const [tx, ty] of tips) g.lineTo(tx, ty);
  g.closePath();
  ink(g, shade(c, -0.1), 1.2);
  for (const [tx, ty] of tips) {
    circle(g, tx, ty, 1.8 * k);
    ink(g, shade(c, 0.15), 1);
  }
}

function leg(b, l, c, s) {
  ellipse(b, s * 24, 17, 13, 11, s * 0.5);
  ink(b, rubber(b, s * 21, 12, 16, c), 2.4);
  b.beginPath();
  b.arc(s * 24, 17, 8, s > 0 ? 3.6 : -0.5, s > 0 ? 5.4 : 1.3);
  line(b, rgba('#fffbd0', 0.4), 1.2);
  for (let i = 0; i < 3; i++) {
    const a = s * (0.3 + i * 0.45);
    b.beginPath();
    b.moveTo(s * 27, 27);
    b.quadraticCurveTo(s * 27 + Math.sin(a) * 6, 30, s * 27 + Math.sin(a) * 11, 31 + Math.cos(a) * 4);
    line(b, INK, 4.2);
    line(b, shade(c, -0.15), 2);
    circle(b, s * 27 + Math.sin(a) * 11, 31 + Math.cos(a) * 4, 2.2);
    ink(b, shade(c, 0.1), 1.2);
  }
  shine(l, s * 20, 11, 4, 2, s * 0.6, 0.35);
}

function cheeks(b, l, c, f) {
  both((s) => {
    const [x, y, r] = f ? [s * 19, -5, 11] : [s * 17, -6, 6.5];
    circle(b, x, y, r);
    ink(b, rubber(b, x - s * 2, y - 2, r * 1.4, f ? shade(c, 0.22) : c), f ? 2.2 : 1.6);
    blush(b, x, y + r * 0.2, r * 0.6, r * 0.4);
    if (f) {
      b.beginPath();
      b.arc(x, y, r - 2.5, s > 0 ? -1.2 : 3.4, s > 0 ? -0.3 : 4.3);
      line(b, rgba('#ffffff', 0.5), 1.2);
    }
    shine(l, x - s * r * 0.2, y - r * 0.45, r * 0.42, r * 0.22, s * 0.4, f ? 0.7 : 0.4);
  });
}

function mouth(b, l, f) {
  b.beginPath(); // the grin
  b.moveTo(-17, -12);
  b.quadraticCurveTo(-9, -3, 0, -4);
  b.quadraticCurveTo(9, -3, 17, -12);
  line(b, INK, 2);
  both((s) => {
    b.beginPath();
    b.moveTo(s * 17, -12);
    b.lineTo(s * 19, -14);
    line(b, INK, 1.6);
  });
  circle(b, 0, -4.4, 4.4); // the nozzle: a rubber lip round a dark hole
  ink(b, lin(b, 0, -9, 0, 0, [[0, '#fffbd0'], [1, '#a8c860']]), 1.6);
  circle(b, 0, -4.2, 2.2);
  b.fillStyle = MOUTH;
  b.fill();
  if (f) droplet(b, l, 0, 1.2, 2.4);
}

function spots(b, c) {
  for (let i = 0; i < 9; i++) {
    const a = hash(i * 7 + 1) * Math.PI * 2;
    const d = 0.35 + hash(i * 7 + 2) * 0.6;
    const [x, y] = [Math.cos(a) * 22 * d, -18 + Math.sin(a) * 9 * d + (i > 5 ? 22 : 0)];
    if (Math.abs(x) < 7 && y > -12) continue;
    ellipse(b, x, y, 2 + hash(i * 7 + 3) * 2.2, 1.6 + hash(i * 7 + 4) * 1.6, a);
    b.fillStyle = rgba(spotOf(c), 0.75);
    b.fill();
  }
}

export function gunner(b, l, f, c) {
  suds(b, l, 0, 34, 70, 5, 14, 11);
  both((s) => leg(b, l, c, s));
  const body = (g) => ellipse(g, 0, 10, 24, 21);
  const head = (g) => ellipse(g, 0, -13, 25, 16);
  const bumps = [-1, 1].map((s) => (g) => circle(g, s * 12, -27, 9.5));
  merged(b, [body, head, ...bumps], rubber(b, -8, -14, 46, c));
  b.save();
  body(b);
  b.clip();
  ellipse(b, 0, 15, 16, 14); // the belly, with its folds
  b.fillStyle = rad2(b, BELLY);
  b.fill();
  for (const y of [8, 13, 18, 23]) {
    b.beginPath();
    b.moveTo(-11 + Math.abs(y - 15) * 0.5, y);
    b.quadraticCurveTo(0, y + 2, 11 - Math.abs(y - 15) * 0.5, y);
    line(b, rgba('#a8a050', 0.4), 0.9);
  }
  b.restore();
  spots(b, c);
  both((s) => { // the hands, splayed on the suds
    b.beginPath();
    b.moveTo(s * 16, 14);
    b.quadraticCurveTo(s * 18, 24, s * 12, 29);
    line(b, INK, 6);
    line(b, shade(c, -0.05), 3.4);
    webFoot(b, s * 12, 31, s, 0.7, c);
  });
  for (const s of [-1, 1]) eyeball(b, l, s * 12, -28, 6.4, 6.8, -s * 0.15, 0.55, 0.25, c);
  for (const s of [-1, 1]) { // the nostrils
    ellipse(b, s * 3.4, -17, 1.1, 0.8);
    b.fillStyle = rgba(INK, 0.7);
    b.fill();
  }
  cheeks(b, l, c, f);
  mouth(b, l, f);
  for (const [x, y, r] of [[-20, -16, 1.5], [9, -21, 1.3], [-6, 26, 1.4], [20, 2, 1.6]]) droplet(b, l, x, y, r);
  shine(l, -9, -22, 7, 2.6, -0.3, 0.5);
  shine(l, -14, 2, 2.4, 5, 0.3, 0.3);
}

const rad2 = (g, c) => lin(g, 0, 2, 0, 29, [[0, shade(c, 0.4)], [0.6, c], [1, mix(c, '#a08a30', 0.4)]]);
