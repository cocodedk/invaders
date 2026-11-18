// The Night Editor's hull (World 20, Midnight Press; see editor.js): the great mantle of an ink octopus seen front-on, its dome rising
// behind the eyeshade, its brow and cheeks round the eye sockets, the strap of the eyeshade over its crown, and four back arms curling
// down between the pencil parts, each gripping a smaller red pencil of its own: a red pencil in every arm. The parts (the shade, the eyes, the siphon, the two front arms
// and the pencils) are painted over it. Lights: wet sheen on the dome and the arms, the pencils' points glowing.
import { path, ink, lin, rad, line, rgba, ellipse, TAU, PAL, PART, skin, glow, suckers } from './editor-kit.js';
import { redPencil, PENCIL_R } from './editor-limbs.js';

const BACK_PENCIL = 52; // the length of the pencil a back arm holds

const MANTLE = [[0, -196], [70, -190], [140, -160], [190, -110], [206, -50], [196, 10], [170, 60], [120, 96], [0, 108],
  [-120, 96], [-170, 60], [-196, 10], [-206, -50], [-190, -110], [-140, -160], [-70, -190]];

// A back arm from (x, y) curling down and out by s, its tip at the given point, its width w at the root.
function backArm(b, l, x, y, s, tip, w) {
  const [tx, ty] = tip;
  b.beginPath();
  b.moveTo(x - w / 2, y);
  b.bezierCurveTo(x - w / 2 + s * 10, y + 70, tx - s * 40, ty - 30, tx, ty);
  b.bezierCurveTo(tx + s * 30, ty - 6, tx + s * 18, ty - 34, tx + s * 4, ty - 26);
  b.bezierCurveTo(tx - s * 20, ty - 50, x + w / 2 + s * 20, y + 60, x + w / 2, y);
  b.closePath();
  ink(b, skin(b, x - w, y, tx, ty), 3.4);
  const pts = [];
  for (let i = 1; i < 7; i++) {
    const k = i / 7;
    pts.push([x + (tx - x) * k + s * Math.sin(k * Math.PI) * 10, y + (ty - y) * k - 4]);
  }
  suckers(b, l, pts, 7);
  l.beginPath();
  l.moveTo(x - w / 4, y + 10);
  l.quadraticCurveTo(x, y + 60, tx - s * 20, ty - 26);
  line(l, rgba('#ffffff', 0.2), 3);
  for (const g of [b, l]) { // the red pencil gripped in its tip, pointing down and out
    g.save();
    g.translate(tx, ty - 4);
    g.rotate(Math.PI / 2 - s * 0.6);
  }
  redPencil(b, l, BACK_PENCIL, PENCIL_R / 2);
  b.restore();
  l.restore();
}

export function hull(b, l) {
  for (const [s, x, tip, w] of [[-1, -130, [-150, 186], 54], [-1, -60, [-60, 196], 48], [1, 60, [60, 196], 48], [1, 130, [150, 186], 54]]) {
    backArm(b, l, x, 80, s, tip, w);
  }
  for (const s of [-1, 1]) { // the roots of the front arms, reaching out to the arm parts
    const a = PART[s < 0 ? 'armL' : 'armR'];
    path(b, [[s * 150, -40], [a.x - s * a.w * 0.3, a.y - 34], [a.x - s * a.w * 0.3, a.y + 36], [s * 150, 70]]);
    ink(b, skin(b, s * 150, -40, a.x, a.y + 40), 3);
  }
  path(b, MANTLE);
  ink(b, rad(b, -40, -120, 10, 260, [[0, PAL.skinL], [0.4, PAL.skin], [1, PAL.skinD]]), 4);
  b.save();
  path(b, MANTLE);
  b.clip();
  for (let i = 0; i < 40; i++) { // the mottling of an octopus's skin
    const a = (i * 2.399) % TAU;
    const r = 30 + ((i * 37) % 160);
    ellipse(b, Math.cos(a) * r, -60 + Math.sin(a) * r * 0.7, 4 + (i % 5) * 2, 3 + (i % 4) * 1.6, a);
    b.fillStyle = rgba(i % 3 ? PAL.skinD : PAL.skinL, 0.35);
    b.fill();
  }
  for (const s of [-1, 1]) { // the sockets the eyes sit in, and the cheeks under them
    const e = PART[s < 0 ? 'eyeL' : 'eyeR'];
    ellipse(b, e.x, e.y, e.w * 0.62, e.h * 0.62);
    b.fillStyle = rad(b, e.x, e.y, e.w * 0.3, e.w * 0.62, [[0, rgba(PAL.ink, 0.8)], [1, rgba(PAL.ink, 0)]]);
    b.fill();
    ellipse(b, s * 150, 10, 40, 26);
    b.fillStyle = rgba(PAL.red, 0.12);
    b.fill();
  }
  b.fillStyle = lin(b, 0, 40, 0, 108, [[0, rgba(PAL.ink, 0)], [1, rgba(PAL.ink, 0.6)]]);
  b.fillRect(-210, 40, 420, 70);
  b.restore();
  const sh = PART.shade; // the eyeshade's strap round the crown
  b.beginPath();
  b.moveTo(-sh.w / 2 - 20, sh.y + 6);
  b.quadraticCurveTo(0, sh.y - 44, sh.w / 2 + 20, sh.y + 6);
  line(b, PAL.ink, 9);
  line(b, PAL.greenD, 5);
  l.beginPath();
  l.ellipse(-50, -150, 110, 30, -0.25, Math.PI * 1.05, Math.PI * 1.85);
  line(l, rgba('#ffffff', 0.18), 8);
  glow(l, -70, -150, 70, '#ffffff', 0.08);
  glow(l, 0, 80, 120, PAL.red, 0.06);
}
