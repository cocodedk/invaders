// The sprites of Rubber Regatta's flourishes and ambient (flourish-bath.js, ambient-11.js), each baked once under its own key: the
// colossal drop and the crown it splashes into, a spray droplet, the taps' gush, the giant bubble and the ring of spray it pops into,
// the toy steamer (flourish-bath-steamer.js paints it), and the ambient's soap bubbles (new: an iridescent rim with the room's window
// reflected in it, not world 15's) and steam wisps. warmBathFx() bakes them all, the ambient's in every colour the look names, and the
// far layer's painter calls it (parallax-bath-taps.js), so no frame of the fight pays for one. Nothing is randomised: jitter is a hash.
import { cached, byColor, soft, star, rgba, rad, lin, hash } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL } from './sky-bodies-11-kit.js';
import { paintSteamer, BOAT } from './flourish-bath-steamer.js';
import look from './looks/w19.js';

export const DROP = { w: 56, h: 80 };
export const CROWN = { w: 180, h: 100, base: 86 }; // the canvas and the crater's line in it
export const SPRAY = { w: 14, h: 18 };
export const BIG = 240; // the giant bubble's canvas
export const RING = 180; // the pop's ring of spray
export const PUFF = '#f4f0e4'; // the steamer's smoke
export const WAKE = '#ffffff';
const IRIS = ['#ff9ad0', '#ffd27a', '#c8f07a', '#a8b8ff', '#e0a0ff']; // the film's colours round a bubble's rim (no teal)
const WET = '#2e5c3a'; // water's dark edge, so a drop reads on the cream as on the tiles
const EDGE = rgba(WET, 0.7);
// The gush from a dolphin's mouth: its canvas, the mouth's place in it, and its centreline (px from the mouth) for the spray along it.
export const JET = { w: 310, h: 216, ox: 22, oy: 16, at: (u) => [u * 250, 30 * u + 140 * u * u], girth: (u) => 18 + 28 * u }; // at(u): from the mouth

function dropShape(g, w, h) {
  const r = w / 2 - 3;
  const cy = h - r - 3;
  g.beginPath();
  g.moveTo(w / 2, 2);
  g.bezierCurveTo(w / 2 + r * 0.3, cy - r * 1.2, w / 2 + r, cy - r * 0.6, w / 2 + r, cy);
  g.arc(w / 2, cy, r, 0, Math.PI);
  g.bezierCurveTo(w / 2 - r, cy - r * 0.6, w / 2 - r * 0.3, cy - r * 1.2, w / 2, 2);
  g.closePath();
  g.fillStyle = rad(g, w / 2 - r * 0.3, cy - r * 0.3, 1, r * 1.4, [[0, rgba(PAL.water.hi, 0.7)], [0.7, rgba(PAL.water.mid, 0.6)], [1, rgba(PAL.water.lo, 0.85)]]);
  g.fill();
  g.lineWidth = Math.max(1.4, w / 28);
  g.strokeStyle = EDGE;
  g.stroke();
  g.fillStyle = rgba('#ffffff', 0.9); // the window in it
  g.beginPath();
  g.ellipse(w / 2 - r * 0.38, cy - r * 0.35, r * 0.18, r * 0.3, -0.4, 0, TAU);
  g.fill();
}

export const dropSprite = () => cached('bathDrop', DROP.w, DROP.h, dropShape);
export const spraySprite = () => cached('bathSpray', SPRAY.w, SPRAY.h, dropShape);

export const crownSprite = () => cached('bathCrown', CROWN.w, CROWN.h, (g, w) => {
  const [cx, base, n] = [w / 2, CROWN.base, 9];
  g.fillStyle = rgba(PAL.water.hi, 0.8);
  g.strokeStyle = EDGE;
  g.lineWidth = 1.6;
  for (let i = 0; i < n; i++) { // the spikes, tallest in the middle, leaning out, a bead on each tip
    const x = cx + (i - (n - 1) / 2) * 15;
    const tall = 26 + 40 * Math.sin((Math.PI * (i + 0.5)) / n) * (0.7 + 0.3 * hash(i + 50));
    const lean = (i - (n - 1) / 2) * 2.4;
    g.beginPath();
    g.moveTo(x - 7, base);
    g.quadraticCurveTo(x - 2 + lean * 0.5, base - tall * 0.6, x + lean, base - tall);
    g.quadraticCurveTo(x + 2 + lean * 0.5, base - tall * 0.6, x + 7, base);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(x + lean * 1.15, base - tall - 7, 4.2, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.beginPath(); // the crater's lip
  g.ellipse(cx, base, 78, 11, 0, 0, TAU);
  g.fill();
  g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.85);
  g.beginPath();
  g.ellipse(cx, base - 2, 70, 7, 0, Math.PI * 1.1, Math.PI * 1.9);
  g.stroke();
});

export const jetSprite = () => cached('bathJet', JET.w, JET.h, (g) => {
  const N = 24;
  const edge = (u, k) => {
    const [x, y] = JET.at(u);
    const [x2, y2] = JET.at(u + 0.01);
    const l = Math.hypot(x2 - x, y2 - y);
    return [JET.ox + x - ((y2 - y) / l) * JET.girth(u) * k, JET.oy + y + ((x2 - x) / l) * JET.girth(u) * k];
  };
  const [ex, ey] = JET.at(1);
  const fade = (c, a) => lin(g, JET.ox, JET.oy, JET.ox + ex, JET.oy + ey, [[0, rgba(c, a)], [0.7, rgba(c, a)], [1, rgba(c, 0)]]); // thinning to spray at its end
  g.beginPath();
  for (let i = 0; i <= N; i++) g.lineTo(...edge(i / N, 0.5));
  for (let i = N; i >= 0; i--) g.lineTo(...edge(i / N, -0.5));
  g.closePath();
  g.fillStyle = fade(PAL.water.hi, 0.85);
  g.fill();
  g.lineWidth = 1.8;
  g.strokeStyle = fade(WET, 0.7); // water's dark edge, along the two sides only: the ends are open
  for (const k of [0.5, -0.5]) {
    g.beginPath();
    for (let i = 1; i <= N; i++) g.lineTo(...edge(i / N, k));
    g.stroke();
  }
  g.strokeStyle = fade('#ffffff', 0.75); // white water streaming along it
  g.lineWidth = 2;
  for (const k of [-0.25, 0.05, 0.3]) {
    g.beginPath();
    for (let i = 1; i < N; i++) g.lineTo(...edge(i / N, k));
    g.stroke();
  }
  g.globalAlpha = 0.95; // the burst of white water at the mouth, over the jet's open end
  g.drawImage(soft('#ffffff'), JET.ox - 18, JET.oy - 15, 36, 30);
  g.drawImage(soft(PAL.foam.mid), JET.ox - 6, JET.oy - 8, 30, 24);
});

// A soap bubble: a faint tint of its colour, the tiles' green reflected as a soft crescent round its bottom, the room's window bowed
// small in its upper left under a soft bloom, an iridescent rim turning through the film's colours, a bright arc and a glint.
function bubble(g, w, tint, turn) {
  const [c, r] = [w / 2, w / 2 - Math.max(2, w / 40)];
  g.save();
  g.beginPath();
  g.arc(c, c, r, 0, TAU);
  g.fillStyle = rad(g, c, c, r * 0.55, r, [[0, rgba(tint, 0)], [0.75, rgba(tint, 0.1)], [1, rgba(tint, 0.35)]]);
  g.fill();
  g.clip();
  g.fillStyle = rad(g, c, c - r * 0.35, r * 0.95, r * 1.36, [[0, rgba(PAL.wall.light, 0)], [0.55, rgba(PAL.wall.light, 0.34)], [1, rgba(PAL.wall.light, 0)]]);
  g.fillRect(0, 0, w, w);
  const [wx, wy, s] = [c - r * 0.42, c - r * 0.44, r * 0.15];
  g.globalAlpha = 0.32;
  g.drawImage(soft('#ffffff'), wx - s * 2.6, wy - s * 2.6, s * 5.2, s * 5.2);
  g.globalAlpha = 1;
  g.fillStyle = rgba('#fffbe6', 0.6);
  for (let i = 0; i < 4; i++) { // four panes, their edges bowed out by the film
    const [x0, y0] = [wx + ((i % 2) - 1) * s * 1.18 + s * 0.06, wy + ((i >> 1) - 1) * s * 1.32 + s * 0.06];
    g.beginPath();
    g.moveTo(x0, y0 + s * 0.1);
    g.quadraticCurveTo(x0 + s / 2, y0 - s * 0.16, x0 + s, y0 + s * 0.1);
    g.quadraticCurveTo(x0 + s * 1.14, y0 + s * 0.62, x0 + s, y0 + s * 1.16);
    g.quadraticCurveTo(x0 + s / 2, y0 + s * 1.32, x0, y0 + s * 1.16);
    g.quadraticCurveTo(x0 - s * 0.14, y0 + s * 0.62, x0, y0 + s * 0.1);
    g.fill();
  }
  g.restore();
  g.lineWidth = Math.max(1.6, w / 50);
  IRIS.forEach((col, i) => {
    const a0 = (i / IRIS.length) * TAU + turn;
    g.strokeStyle = rgba(col, 0.62);
    g.beginPath();
    g.arc(c, c, r - g.lineWidth / 2, a0, a0 + TAU / IRIS.length + 0.2);
    g.stroke();
  });
  g.lineWidth = Math.max(1, w / 120);
  g.strokeStyle = rgba('#3a5a40', 0.35); // a dark hairline outside it, so it reads on the cream foam
  g.beginPath();
  g.arc(c, c, r + 0.5, 0, TAU);
  g.stroke();
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.2, w / 70);
  g.strokeStyle = rgba('#ffffff', 0.55); // the bright arc inside the rim, toward the window
  g.beginPath();
  g.arc(c, c, r * 0.84, Math.PI * 1.08, Math.PI * 1.42);
  g.stroke();
  g.fillStyle = rgba('#ffffff', 0.9);
  g.beginPath();
  g.ellipse(c + r * 0.5, c + r * 0.5, r * 0.08, r * 0.05, -0.7, 0, TAU);
  g.fill();
}

export const bigBubbleSprite = () => cached('bathBigBubble', BIG, BIG, (g, w) => bubble(g, w, '#ffe8f6', 0.4));
export const soapBubble = byColor((color) => cached('bathSoap' + color, 64, 64, (g, w) => bubble(g, w, color, hash(color.length + parseInt(color.slice(1), 16)) * TAU)));

export const popRingSprite = () => cached('bathPopRing', RING, RING, (g, w) => {
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + hash(i + 300) * 0.2;
    const [d, r] = [w / 2 - 12 - hash(i + 310) * 10, 3 + hash(i + 320) * 5];
    g.globalAlpha = 0.6 + 0.4 * hash(i + 330);
    g.drawImage(soft('#ffffff'), w / 2 + Math.cos(a) * d - r, w / 2 + Math.sin(a) * d - r, r * 2, r * 2);
  }
});

export const steamerSprite = () => cached('bathSteamer', BOAT.w, BOAT.h, paintSteamer);

// A wisp of steam: soft puffs along a lazy S, thinning as it climbs.
export const wisp = byColor((color) => cached('bathWisp' + color, 96, 160, (g) => {
  for (let i = 0; i < 12; i++) {
    const u = i / 11;
    const r = 26 - 12 * u;
    g.globalAlpha = 0.55 * (1 - 0.6 * u);
    g.drawImage(soft(color), 48 + Math.sin(u * 5) * 16 - r, 150 - u * 136 - r, r * 2, r * 2);
  }
}));

const AMBIENT = { soapbubbles: soapBubble, steamwisps: wisp, waterglints: star };
export function warmBathFx() {
  for (const make of [dropSprite, spraySprite, crownSprite, jetSprite, bigBubbleSprite, popRingSprite, steamerSprite]) make();
  for (const c of [PUFF, WAKE]) soft(c);
  for (const a of look.ambient) for (const c of a.colors) AMBIENT[a.kind]?.(c);
}
