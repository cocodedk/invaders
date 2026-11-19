// The Ten-Crowned King's costume (World 21, Golden Isle; see crowns-hull.js): the great gilded shoulder mantle of the dance-drama,
// spanning under the arc of his heads, its edge rising and falling with their chins and flaring up into shoulder pieces at its ends;
// the vermilion robe on his torso with gold borders, a jewelled sash at the waist, layered gold necklaces; and the small gilded flying
// chariot-throne he rides, carved rails and fire beneath. Bake-time only.
import { path, ink, lin, line, rgba, shade, mix, ellipse, circle, both, GOLD, GOLD_D, GOLD_P, VERMILION, GREEN, BLACK, gilt, lacquer, glint,
  petals, trim, PAL, PART, glow, neckOf } from './crowns-kit.js';

const JEWELS = [PAL.red, GREEN, '#3a6ad8'];
const SIDE = ['headL1', 'headL2', 'headL3', 'headL4'];

// How far under a head's chin the mantle's top edge runs, and its jewelled collar sits.
export const edgeUnder = (id) => (id === 'head' ? 30 : 24);
export const collarDrop = (id) => (id === 'head' ? 26 : 20);

// The mantle's top edge, right half, centre out: just under each head's chin; the flare at its end.
export const MANTLE_TOP = [[0, neckOf('head')[1] + edgeUnder('head')], ...SIDE.map((id) => [-neckOf(id)[0], neckOf(id)[1] + edgeUnder(id)]), [430, -50]];
const BOTTOM = [[420, 0], [395, 32], [300, 50], [200, 32], [120, 10], [0, 2]];
const outline = () => {
  const half = [...MANTLE_TOP, ...BOTTOM];
  return [...half, ...half.toReversed().map(([x, y]) => [-x, y])];
};

// A string of jewels along pts, r each, the colours turning.
export function jewels(b, l, pts, r) {
  pts.forEach(([x, y], i) => {
    circle(b, x, y, r);
    ink(b, JEWELS[i % JEWELS.length], 1);
    circle(l, x - r * 0.3, y - r * 0.3, r * 0.35);
    l.fillStyle = rgba('#ffffff', 0.6);
    l.fill();
  });
}

// The jewelled collar where a neck rises from the mantle.
export function collar(b, l, x, y, w) {
  path(b, [[x - w * 0.62, y - 5], [x + w * 0.62, y - 5], [x + w * 0.66, y + 5], [x - w * 0.66, y + 5]]);
  ink(b, gilt(b, x - w, y - 5, x + w, y + 5), 1.8);
  jewels(b, l, [-0.35, 0, 0.35].map((t) => [x + t * w, y]), Math.max(2.4, w * 0.09));
}

export function torso(b, l) {
  path(b, [[-175, -10], [175, -10], [140, 140], [-140, 140]]); // the robe on his chest
  ink(b, lacquer(b, VERMILION, -175, -10, 175, 140), 3);
  both((s) => { path(b, [[s * 100, -6], [s * 128, 136]], true); line(b, GOLD, 6); });
  b.beginPath(); // the skirt of the robe over his knees, into the chariot
  b.moveTo(-140, 130);
  b.lineTo(140, 130);
  b.quadraticCurveTo(200, 160, 205, 200);
  b.lineTo(-205, 200);
  b.quadraticCurveTo(-200, 160, -140, 130);
  ink(b, lacquer(b, VERMILION, -205, 130, 205, 200), 3);
  both((s) => { b.beginPath(); b.moveTo(s * 60, 150); b.quadraticCurveTo(s * 70, 176, s * 64, 200); line(b, rgba(BLACK, 0.3), 3); });
  trim(b, -140, 140, 136, 18, GREEN); // the jewelled sash
  jewels(b, l, [-110, -66, -22, 22, 66, 110].map((x) => [x, 136]), 4.4);
  path(b, [[-70, 144], [-50, 144], [-58, 196], [-80, 192]]); // its knotted end, hanging
  ink(b, lacquer(b, GREEN, -80, 144, -50, 196), 2);
  trim(b, -78, -56, 188, 6);
}

export function mantle(b, l) {
  const pts = outline();
  path(b, pts);
  ink(b, gilt(b, -430, -110, 430, 50), 4);
  b.save();
  path(b, pts);
  b.clip();
  for (const [dy, c, w] of [[14, VERMILION, 12], [30, GREEN, 8]]) { // bands following the top edge
    path(b, MANTLE_TOP.map(([x, y]) => [x, y + dy]).concat(MANTLE_TOP.toReversed().map(([x, y]) => [-x, y + dy])), true);
    line(b, c, w);
  }
  for (const [x, y] of BOTTOM.slice(1, -1)) both((s) => petals(b, s * x, y - 12, 26, 5, GOLD, Math.PI * 1.1, Math.PI * 1.9, 1));
  b.restore();
  for (let x = -380; x <= 380; x += 38) { // pendants hanging from its lower edge
    const y = 8 + 40 * Math.pow(Math.abs(x) / 400, 1.2) - (Math.abs(x) > 330 ? 20 : 0);
    path(b, [[x - 6, y], [x + 6, y], [x, y + 16]]);
    ink(b, gilt(b, x - 6, y, x + 6, y + 16), 1.2);
  }
  both((s) => { // the flared shoulder pieces, curling up at its ends
    b.beginPath();
    b.moveTo(s * 360, -30);
    b.quadraticCurveTo(s * 440, -60, s * 470, -110);
    b.quadraticCurveTo(s * 470, -40, s * 420, 10);
    b.closePath();
    ink(b, gilt(b, s * 360, -110, s * 470, 10), 3);
    jewels(b, l, [[s * 430, -50], [s * 452, -82]], 4);
    glint(l, s * 462, -100, 5, 0.55);
  });
  for (const [x, y] of MANTLE_TOP.slice(1, -1)) both((s) => glint(l, s * x, y + 4, 4, 0.35));
}

export function necklaces(b, l) {
  for (const [w, dip, k] of [[130, 46, 0], [110, 30, 1], [90, 16, 2]]) {
    b.beginPath();
    b.moveTo(-w, -36 + k * 6);
    b.quadraticCurveTo(0, -36 + dip * 2, w, -36 + k * 6);
    line(b, BLACK, 7);
    b.stroke();
    line(b, GOLD, 4);
    jewels(b, l, [-0.6, -0.3, 0, 0.3, 0.6].map((t) => [t * w, -36 + k * 6 + dip * (1 - t * t)]), 3.4 + (2 - k));
  }
}

export function chariot(b, l) {
  for (const [x, w] of [[-120, 40], [-40, 46], [40, 46], [120, 40]]) glow(l, x, 228, w * 0.95, PAL.ember, 0.4); // the fire it flies on
  glow(l, 0, 220, 56, PAL.flame, 0.22);
  path(b, [[-215, 182], [215, 182], [196, 232], [-196, 232]]); // the car
  ink(b, gilt(b, -215, 182, 215, 232), 3);
  trim(b, -205, 205, 222, 12);
  for (let x = -192; x <= 192; x += 24) { // the carved rails
    path(b, [[x - 4, 186], [x + 4, 186], [x + 3, 214], [x - 3, 214]]);
    ink(b, lin(b, x - 4, 0, x + 4, 0, [[0, GOLD_P], [1, GOLD_D]]), 1.2);
  }
  path(b, [[-220, 178], [220, 178], [218, 188], [-218, 188]]); // the top rail
  ink(b, gilt(b, -220, 176, 220, 190), 2);
  both((s) => { // its prow scrolls, curling forward at the ends
    b.beginPath();
    b.moveTo(s * 210, 180);
    b.quadraticCurveTo(s * 250, 170, s * 245, 205);
    b.quadraticCurveTo(s * 235, 225, s * 200, 228);
    line(b, BLACK, 8);
    b.stroke();
    line(b, GOLD, 4);
    glint(l, s * 240, 186, 4, 0.45);
  });
}
