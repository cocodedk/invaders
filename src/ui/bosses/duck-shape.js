// The Dowager Duck's silhouette (World 19, Rubber Regatta; bosses/duck*.js): a colossal rubber duck seen front-on, in pieces painted one over the
// next, every piece drawn to the hit boxes (duck-kit.js PART): in free flight a box rams (core/free.js), so each box lies inside her art on every
// side, its corners too (duck-form.test.js). A superellipse { x, y, a, b, n } (|dx / a| ^ n + |dy / b| ^ n = 1) gives rubber's swollen rounds.
//   HEAD, BODY     the round head (held under TOP: its crown is hidden by the cap) on the plump body, boss coordinates
//   CAP, FRILL     the baggy shower cap's outline and the gathered edge under it, left to right; capTop(x), frillY(x) their heights
//   WING           the left stubby wing's tip, poking out of the armband (the right is its mirror)
//   EYE            [x, y, rx, ry] of the left eye (the right is its mirror), beside the bill and under the frill
//   BOBBLE, BILL, BAND, BELLY, SQUEAK   superellipses in their parts' coordinates, each holding its box (the belly's top under the chin:
//                  BELLY_OUT its outline below the head); FOOT the left foot's outline (mirrored)
//   RING           the ring of foam she floats in: FOAM_BACK lumps behind her (the hull), FOAM_FRONT the crest across her waist (the live pass), [x, y, r]
//   supPts(s, k)   a superellipse's outline as k points; polyDepth(poly, x, y) how far inside a polygon a point is (px, negative outside)
//   PIECES         every piece's outline in boss coordinates; depth(x, y) how far inside her silhouette a boss-local point is
import { PART, hash } from './duck-kit.js';

const rnd = (v) => Math.round(v * 10) / 10;
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const at = (pts, dx, dy) => pts.map(([x, y]) => [rnd(x + dx), rnd(y + dy)]);

// flare: how much wider the bottom half is than the top (a goes from a - flare at the top to a + flare at the bottom), as a bill flares to its corners.
export function supPts({ x = 0, y = 0, a, b, n, flare = 0 }, k = 96) {
  return Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2;
    const [c, s] = [Math.cos(t), Math.sin(t)];
    return [rnd(x + (a + flare * s) * Math.sign(c) * Math.abs(c) ** (2 / n)), rnd(y + b * Math.sign(s) * Math.abs(s) ** (2 / n))];
  });
}

export const HEAD = { x: 0, y: -80, a: 170, b: 96, n: 2.3 }; // top at -176, under the cap; the chin at 16, over the belly's top
export const BODY = { x: 0, y: 54, a: 232, b: 122, n: 2.4 }; // -68 .. 176: the plump body, wider than the head
export const WING = { x: -356, y: 4, a: 44, b: 44, n: 2.2 };
export const EYE = [-130, -90, 26, 32];
export const BOBBLE = { a: 68, b: 46, n: 2.1 };
export const BILL = { a: 102, b: 56, n: 2.6, flare: 7 };
export const BAND = { a: 98, b: 68, n: 5 };
export const BELLY = { a: 142, b: 74, n: 3 };
export const SQUEAK = { a: 88, b: 50, n: 2.2 };

// The cap: a baggy dome like a mob cap, wider than the head and puffed out at the sides, whose crown is held under TOP (the bobble sits in front of
// it); its gathered edge (FRILL) runs across the brow above the eyes and down the sides of her face to the armbands, framing it like a bonnet.
export const capTop = (x) => -177 + 58 * (x / 220) ** 4; // a puffed crown, flat under the HUD's line, falling away at the sides
export const frillY = (x) => -150 + 78 * (Math.max(0, Math.abs(x) - 60) / 145) ** 2.2;
const xs = (x0, x1, n) => Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
export const FRILL = xs(-205, 205, 40).map((x) => [rnd(x), rnd(frillY(x))]);
const SIDE = [[228, -106], [231, -91], [226, -77], [214, -69]]; // the sides hang down over her ears to the armbands, not out into the air
export const CAP = [...xs(-220, 220, 37).map((x) => [rnd(x), rnd(capTop(x))]), ...SIDE, ...FRILL.toReversed().slice(1, -1), ...mirror(SIDE).toReversed()];

// The left foot, toes down, splayed out by TILT: an orange web from the ankle (under the foam) to three round toes.
export const TILT = 0.2;
const SCALLOP = xs(76, -76, 36).map((x) => [x, 44 + 20 * Math.abs(Math.cos((Math.PI * x) / 64)) ** 0.7]);
const WEB = [[-62, -52], [66, -52], [72, 0], [74, 46], ...SCALLOP.slice(1, -1), [-74, 46], [-70, 0]];
export const FOOT = WEB.map(([x, y]) => [rnd(x * Math.cos(TILT) - y * Math.sin(TILT)), rnd(x * Math.sin(TILT) + y * Math.cos(TILT))]);

// The ring of foam: an ellipse round her waist, seen nearly edge on. The back is heaped into hills at her sides; the front is a crest of lumps
// across her waist, over the ankles, the squeaker's top and the belly's foot (the live pass lays it, so that the parts paddle under it).
export const RING = { y: 74, rx: 440, ry: 20 };
export const EDGE = 476; // no foam further out than this either side (duck.js's pad holds it)
const arc = (x, s) => RING.y + s * RING.ry * Math.sqrt(Math.max(0, 1 - (x / RING.rx) ** 2));
const half = (n, f) => {
  const left = Array.from({ length: n }, (_, i) => f(i)).filter(Boolean);
  return [...left, ...left.filter(([x]) => x < 0).map(([x, y, r]) => [-x, y, r])];
};
// A heap: lumps along the arc (side s: 1 front, -1 back), n a side, each row smaller and nearer than the one before, the biggest at her sides.
const heap = (s, rows, seed) => [].concat(...rows.map(({ n, r0, r1, dy, lift = 0 }, k) => half(n + 1, (i) => {
  const x = -462 + (i + (k % 2) * 0.5) * (440 / (n - 0.5)) + (hash(seed + k * 50 + i) - 0.5) * 14;
  const side = Math.min(1, Math.abs(x) / 440) ** 1.5;
  const r = r0 + (r1 - r0) * side * (0.7 + 0.6 * hash(seed + k * 50 + i + 7));
  return x > 4 || x - r < -EDGE ? null : [rnd(x), rnd(arc(x, s) + dy - lift * side - (hash(seed + i * 3 + k) - 0.5) * 8), rnd(r)];
})));
export const FOAM_FRONT = heap(1, [{ n: 16, r0: 21, r1: 33, dy: -8, lift: 20 }, { n: 17, r0: 17, r1: 25, dy: 6, lift: 6 }, { n: 10, r0: 10, r1: 15, dy: -18, lift: 26 }], 300);
export const FOAM_BACK = heap(-1, [{ n: 8, r0: 28, r1: 44, dy: -6, lift: 46 }, { n: 9, r0: 20, r1: 32, dy: 6, lift: 18 }], 600);

export function polyDepth(poly, x, y) {
  let hit = false;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
    const [dx, dy] = [bx - ax, by - ay];
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (ax + dx * u), y - (ay + dy * u)));
  }
  return hit ? best : -best;
}

// The belly's outline in its own frame, its top pushed down to the chin wherever the head lies over it (the tum swells out below the head).
const chinY = (x) => (Math.abs(x) >= HEAD.a ? -Infinity : HEAD.y + HEAD.b * (1 - (Math.abs(x) / HEAD.a) ** HEAD.n) ** (1 / HEAD.n));
export const BELLY_OUT = supPts(BELLY).map(([x, y]) => [x, rnd(Math.max(y, Math.min(chinY(x + PART.belly.x) - PART.belly.y, BELLY.b - 8)))]);

const of = (id) => [PART[id].x, PART[id].y];
const disc = ([x, y, r]) => supPts({ x, y, a: r, b: r, n: 2 }, 24);
export const PIECES = {
  head: supPts(HEAD), body: supPts(BODY), cap: CAP, wingL: supPts(WING), wingR: mirror(supPts(WING)),
  bobble: at(supPts(BOBBLE), ...of('bobble')), bill: at(supPts(BILL), ...of('bill')), bandL: at(supPts(BAND), ...of('bandL')),
  bandR: at(supPts(BAND), ...of('bandR')), belly: at(BELLY_OUT, ...of('belly')), footL: at(FOOT, ...of('footL')),
  footR: at(mirror(FOOT), ...of('footR')), squeak: at(supPts(SQUEAK), ...of('squeak')),
};
const FOAM = [...FOAM_FRONT, ...FOAM_BACK].map(disc);

export const depth = (x, y) => Math.max(...Object.values(PIECES).map((p) => polyDepth(p, x, y)), ...FOAM.map((p) => polyDepth(p, x, y)));
