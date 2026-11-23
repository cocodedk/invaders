// World 22, Wanderlight: the Hush's craft are grey kites, pencilled on the parchment like everything else in the land (colours:
// wander-kit.js, looks/w22.js), the mockup's kite: a diamond split into a lit half and a shaded half by its spine and cross-stick, a thin
// tail hanging from its foot and its shadow cast well off to one side, which is what shows that it flies. The five roles differ in size,
// shape and one mark: the Kite (grunt), the narrow Dart (diver) with a dark nose, the Watcher (gunner) with one open violet eye, the
// Plated (armored) with a second diamond and rivets inside the first, and the Gift (carrier), gold, with a ribbon tail in the glider's
// gold and turquoise. All of it is baked once; the tail wavers between the two frames, and the only light is the glint in the Watcher's
// eye and the Gift's sparkle. The kites bob a little. A tail hangs below the diamond, which is centred, so the canvas is SIZE, bigger than
// the usual (bake.js SIZE), to hold the tail as well as the diamond.
import { path, circle, ellipse, shade, rgba } from './kit.js';
import { tidy } from './w16-kit.js';
import { PAL } from '../wander-kit.js';

const SIZE = 160; // px, a sprite canvas's edge: a kite, its tail and its shadow stand in it
const WAVER = 6; // px: how far the tail swings out of line, and the frame swings it the other way
const SHADOW = [20, 24]; // px: how far the shadow lies right of its kite and below it, the mockup's

const diamond = (w, h) => [[0, -h], [w, 0], [0, h], [-w, 0]];

// The tail hangs from the diamond's foot, wavering between the two frames, the further down the wider; the Gift's is two strands.
function tail(b, f, h, { knots, step, ribbon }) {
  const lines = ribbon ? [[PAL.gold, 5, 0], [PAL.teal, 3, 3]] : [[PAL.tail, 2, 0]];
  b.lineCap = 'round';
  for (const [colour, width, off] of lines) {
    b.strokeStyle = colour;
    b.lineWidth = width;
    b.beginPath();
    b.moveTo(off, h);
    for (let i = 1; i <= knots; i++) b.lineTo(off + Math.sin(i * 0.9 + f * Math.PI) * WAVER * Math.min(1, i / 2), h + i * step);
    b.stroke();
  }
}

// The kite over its shadow and its tail: the diamond, its shaded right half, its pencil outline, spine and cross-stick.
function body(b, f, c, K) {
  const { w, h, line = 1.6 } = K;
  path(b, diamond(w, h).map(([x, y]) => [x + SHADOW[0], y + SHADOW[1]]));
  b.fillStyle = 'rgba(40,40,50,0.16)';
  b.fill();
  tail(b, f, h, K);
  path(b, diamond(w, h));
  b.fillStyle = c;
  b.fill();
  path(b, [[0, -h], [w, 0], [0, h]]);
  b.fillStyle = shade(c, -0.18);
  b.fill();
  path(b, diamond(w, h));
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = line;
  b.lineJoin = 'round';
  b.stroke();
  b.lineWidth = 1.6;
  b.beginPath();
  b.moveTo(0, -h);
  b.lineTo(0, h);
  b.moveTo(-w, 0);
  b.lineTo(w, 0);
  b.stroke();
}

// A kite painter (b, l, frame, colour) from its shape and its mark (drawn over the body, on the lights layer l as well).
const kite = (K, mark = () => {}) => {
  const paint = tidy((b, l, f, c) => {
    body(b, f, c, K);
    mark(b, l, K);
  });
  paint.size = SIZE;
  return paint;
};

function eyeMark(b, l) { // the Watcher's open eye: a pale lid, a violet pupil, a glint of light
  ellipse(b, 0, 2, 11, 6);
  b.fillStyle = '#f2efe6';
  b.fill();
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = 1.4;
  b.stroke();
  circle(b, 0, 2, 4);
  b.fillStyle = PAL.violet;
  b.fill();
  circle(l, -1.2, 0.8, 1.4);
  l.fillStyle = 'rgba(255,255,255,0.9)';
  l.fill();
}

function platesMark(b, l, { w, h }) { // the Plated's inner diamond and two rivets
  path(b, diamond(w * 0.55, h * 0.55));
  b.fillStyle = rgba(PAL.stoneDark, 0.35);
  b.fill();
  b.strokeStyle = PAL.kiteLine;
  b.lineWidth = 1.6;
  b.stroke();
  for (const s of [-1, 1]) {
    circle(b, s * w * 0.8, 0, 2.2);
    b.fillStyle = PAL.kiteLine;
    b.fill();
  }
}

function noseMark(b, l, { w, h }) { // the Dart's dark nose
  path(b, [[0, -h], [w * 0.5, -h * 0.45], [-w * 0.5, -h * 0.45]]);
  b.fillStyle = PAL.kiteLine;
  b.fill();
}

function sparkleMark(b, l) { // the Gift's sparkle: a four-point star, pale on the gold and again on the lights
  for (const g of [b, l]) {
    path(g, [[0, -9], [2.4, -2.4], [9, 0], [2.4, 2.4], [0, 9], [-2.4, 2.4], [-9, 0], [-2.4, -2.4]]);
    g.fillStyle = g === b ? '#fff6d8' : 'rgba(255,240,190,0.7)';
    g.fill();
  }
}

export default {
  rate: 2,
  sync: false,
  bob: 3,
  halo: 0, // grey kites do not glow (the Gift's pulse, which aliens/index.js always draws, is its own)
  grunt: kite({ w: 22, h: 30, knots: 5, step: 8 }),
  diver: kite({ w: 14, h: 36, knots: 3, step: 8 }, noseMark),
  gunner: kite({ w: 24, h: 28, knots: 5, step: 8 }, eyeMark),
  armored: kite({ w: 28, h: 30, knots: 4, step: 8, line: 3.2 }, platesMark),
  carrier: kite({ w: 30, h: 34, knots: 6, step: 7, ribbon: true }, sparkleMark),
};
