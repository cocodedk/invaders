// World 19, Rubber Regatta, the diver (see w19.js): THE SLIPPER, a wet bar of pink soap squirting out of the foam as if a hand had
// squeezed it, diving face first. A rounded slab with its darker side showing, a soft bevel, a stamped oval with a wave in it, the
// pinch marks of the squeeze at its waist and a wide-eyed, open-mouthed grin at its leading end (sprites face down, toward the ship);
// suds cling to its tail and a trail of bubbles streams up behind it. On beat 0 it is stretched long and thin, on beat 1 squashed
// short and wide, and the bubbles have moved on. Lights: the slick shine, the glints and the bubbles' rims.
import { ink, lin, rgba, shade, mix, line, ellipse, both, INK, MOUTH, hash, shine, eyeball, tongue, bubble, suds } from './w19-kit.js';

const CY = 10; // the bar's centre, a little low: the bubbles stream up above it
export const SIZE = 112; // a taller canvas, so the trail has the room

// The bar's face as the current path: w across, h long, its long sides pinched in by p at the middle.
export function slab(g, w, h, p, dx = 0, dy = 0) {
  const [l, r, t, bt, k] = [-w / 2 + dx, w / 2 + dx, CY - h / 2 + dy, CY + h / 2 + dy, 10];
  g.beginPath();
  g.moveTo(l + k, t);
  g.lineTo(r - k, t);
  g.quadraticCurveTo(r, t, r, t + k);
  g.quadraticCurveTo(r - p * 2, CY + dy, r, bt - k);
  g.quadraticCurveTo(r, bt, r - k, bt);
  g.lineTo(l + k, bt);
  g.quadraticCurveTo(l, bt, l, bt - k);
  g.quadraticCurveTo(l + p * 2, CY + dy, l, t + k);
  g.quadraticCurveTo(l, t, l + k, t);
  g.closePath();
}

function bar(b, l, c, w, h, p) {
  slab(b, w, h, p, 4, 5); // the side of the slab
  ink(b, lin(b, 0, CY - h / 2, 0, CY + h / 2 + 5, [[0, mix(c, '#7a1030', 0.35)], [1, mix(c, '#4a0818', 0.6)]]), 2.6);
  slab(b, w, h, p);
  ink(b, lin(b, -w / 2, CY - h / 2, w / 2, CY + h / 2, [[0, shade(c, 0.5)], [0.35, shade(c, 0.12)], [0.8, c], [1, mix(c, '#a01848', 0.3)]]), 2.6);
  b.save();
  slab(b, w, h, p);
  b.clip();
  slab(b, w - 8, h - 8, p * 0.8); // the bevel: lit at the upper left, in shade at the lower right
  line(b, rgba('#fff0f6', 0.7), 1.4);
  slab(b, w - 8, h - 8, p * 0.8, 0.8, 1);
  line(b, rgba('#8a1840', 0.35), 1);
  for (let i = 0; i < 22; i++) { // flecks in the soap
    const x = (hash(i * 13 + 1) - 0.5) * (w - 8);
    const y = CY + (hash(i * 13 + 2) - 0.5) * (h - 8);
    ellipse(b, x, y, 0.5 + hash(i * 13 + 3), 0.4 + hash(i * 13 + 4) * 0.6);
    b.fillStyle = rgba(i % 2 ? '#ffffff' : '#b02858', 0.35);
    b.fill();
  }
  b.restore();
  const sy = CY - h * 0.16; // the stamp, pressed in: dark on its upper lip, light on its lower
  ellipse(b, 0, sy, w * 0.3, h * 0.13);
  b.fillStyle = rgba(mix(c, '#c0285a', 0.5), 0.35);
  b.fill();
  line(b, rgba('#7a1030', 0.55), 1.2);
  ellipse(b, 0.6, sy + 0.8, w * 0.3, h * 0.13);
  line(b, rgba('#fff0f6', 0.45), 0.9);
  for (const dy of [-2, 2]) { // the wave in the stamp
    b.beginPath();
    b.moveTo(-w * 0.2, sy + dy);
    b.bezierCurveTo(-w * 0.1, sy + dy - 3, -w * 0.05, sy + dy + 3, 0, sy + dy);
    b.bezierCurveTo(w * 0.05, sy + dy - 3, w * 0.1, sy + dy + 3, w * 0.2, sy + dy);
    line(b, rgba('#7a1030', 0.6), 1.1);
  }
  both((s) => { // the pinch marks of the squeeze
    for (const d of [-4, 0, 4]) {
      b.beginPath();
      b.moveTo(s * (w / 2 - p * 1.4 - 1), CY + d - 2);
      b.quadraticCurveTo(s * (w / 2 - p * 1.4 - 4), CY + d, s * (w / 2 - p * 1.4 - 1), CY + d + 2);
      line(b, rgba('#7a1030', 0.6), 1);
    }
  });
  shine(l, -w * 0.18, CY - h * 0.32, w * 0.2, 3.4, -0.2, 0.6);
  shine(l, w * 0.3, CY + h * 0.2, 1.6, h * 0.12, 0, 0.35);
}

function face(b, l, c, w, h) {
  const ey = CY + h * 0.18;
  for (const s of [-1, 1]) eyeball(b, l, s * w * 0.19, ey, 4.4, 5, 0.1 * s, 0.6, 0, c);
  both((s) => { // brows up: wheee
    b.beginPath();
    b.moveTo(s * w * 0.3, ey - 8);
    b.quadraticCurveTo(s * w * 0.2, ey - 11, s * w * 0.08, ey - 8.6);
    line(b, INK, 1.6);
  });
  const my = CY + h * 0.36;
  b.beginPath();
  b.moveTo(-8, my);
  b.quadraticCurveTo(0, my + 2, 8, my);
  b.quadraticCurveTo(0, my + 11, -8, my);
  b.closePath();
  ink(b, MOUTH, 1.8);
  tongue(b, 1, my + 4, 6, 3.2, 1);
}

// The bubbles streaming up behind it: k picks where each has risen to on this beat.
function trail(b, l, w, top, f) {
  for (let i = 0; i < 9; i++) {
    const rise = (i + (f ? 0.5 : 0)) / 9;
    const y = top - 4 - rise * (top + 50);
    const x = Math.sin(i * 2.1 + f * 1.3) * (4 + rise * 8) + (hash(i * 5 + 1) - 0.5) * w * 0.5;
    bubble(b, l, x, y, 5.6 - rise * 3.6, i + 2);
  }
  both((s) => { // the rush of it
    for (const [x, len] of [[w / 2 + 6, 22], [w / 2 + 11, 13]]) {
      b.beginPath();
      b.moveTo(s * x, top + 10);
      b.lineTo(s * x, top + 10 - len);
      line(b, rgba('#ffffff', 0.55), 1.3);
    }
  });
}

export function diver(b, l, f, c) {
  const [w, h, p] = f ? [38, 48, 4.5] : [32, 56, 2];
  const top = CY - h / 2;
  trail(b, l, w, top, f);
  bar(b, l, c, w, h, p);
  face(b, l, c, w, h);
  suds(b, l, 1, top + 1, w + 6, 4, 9, 7 + f);
}
