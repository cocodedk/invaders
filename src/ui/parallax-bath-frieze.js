// The mosaic frieze of Rubber Regatta's far layer (parallax-bath-taps.js), along the wall at dado height just above the tub's far rim:
// a band of small square tesserae set in dark grout, a coral-and-cream check along its top and bottom rows, and between them a coral
// field with cream fish leaping over cream wave crests, each fish with a peach belly, tail and fin and an ink eye, outlined in a row of
// dark tesserae as a mosaicist sets one so the figure reads from across the room, pitched as if mid-jump, every other one leaping the
// other way. A rounded coral pencil trim runs above the band and a cream bead below it. The band is below FLOOR, the line under which
// no alien holds, so its cream may be pale. Each colour is filled once, as one path of all its tesserae.
import { hash, lin, shade } from './sprites.js';
import { PAL } from './sky-bodies-11-kit.js';

export const FRIEZE = { y: 232, rows: 14, s: 5 }; // layer y of the band's top (frame 612), its rows of tesserae, a tessera's side with its grout
export const FISH = 236; // px between leaping fish
export const BODY = [44, 13]; // a fish's half-length and half-depth, px
const MID = (FRIEZE.rows * FRIEZE.s) / 2;
const GAP = 1.1; // px of grout round a tessera

// The part of the nearest leaping fish that the point x px along the band and y px down it lies in, or null.
function fishAt(x, y) {
  const k = Math.floor(x / FISH);
  const dir = k % 2 ? -1 : 1;
  const tilt = (k % 3 === 1 ? 0.3 : -0.22) * dir;
  const [dx, dy] = [x - (k + 0.5) * FISH, y - MID + 2];
  const u = (dx * Math.cos(tilt) + dy * Math.sin(tilt)) * dir; // along the fish, head forward
  const v = -dx * Math.sin(tilt) + dy * Math.cos(tilt); // across it, back up
  const [a, b] = BODY;
  if ((u / a) ** 2 + (v / b) ** 2 < 1) {
    if (u > a * 0.5 && u < a * 0.68 && v > -b * 0.5 && v < b * 0.05) return PAL.ink; // the eye, set in from the outline
    return v > b * 0.3 ? PAL.peach : PAL.cream; // the belly, the back
  }
  const back = -u - a * 0.8;
  if (back > 0 && back < a * 0.62 && Math.abs(v) < back * 0.9 && !(back > a * 0.38 && Math.abs(v) < (back - a * 0.38) * 1.4)) return PAL.peach; // the forked tail
  if (v < -b * 0.75 && v > -b * 1.8 && u > -a * 0.4 && u < a * 0.1 + (v + b * 0.75) * 0.9) return PAL.peach; // the fin, raked back
  return null;
}

// The colour of the tessera whose centre is x px along the band, in row `row`, and whether it may be fired a shade apart (the fish and
// their outlines are set from one batch, so their shapes stay whole).
function colourAt(x, row) {
  const { rows, s } = FRIEZE;
  if (row === 0 || row === rows - 1) return [Math.floor(x / s) % 2 ? PAL.cream : PAL.coralDark, true];
  const y = (row + 0.5) * s;
  const fish = fishAt(x, y);
  if (fish) return [fish, false];
  if (fishAt(x - s, y) || fishAt(x + s, y) || fishAt(x, y - s) || fishAt(x, y + s)) return [PAL.ink, false]; // the outline
  if (row === rows - 2 && Math.sin(x * 0.055) > 0.4) return [PAL.cream, true]; // a wave crest
  if (row === rows - 3 && Math.sin(x * 0.055 - 0.5) > 0.8) return [PAL.cream, true];
  return [PAL.coral, true];
}

export function frieze(g, w) {
  const { y, rows, s } = FRIEZE;
  g.fillStyle = PAL.grout;
  g.fillRect(0, y, w, rows * s);
  const buckets = new Map();
  const toned = new Map();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c * s < w; c++) {
      let [col, tone] = colourAt(c * s + s / 2, r);
      if (tone && hash(c * 37 + r * 11 + 3) < 0.32) { // each tessera fired a little apart
        if (!toned.has(col)) toned.set(col, shade(col, -0.1));
        col = toned.get(col);
      }
      if (!buckets.has(col)) buckets.set(col, []);
      buckets.get(col).push(c * s + GAP / 2, y + r * s + GAP / 2);
    }
  }
  for (const [col, xy] of buckets) {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < xy.length; i += 2) g.rect(xy[i], xy[i + 1], s - GAP, s - GAP);
    g.fill();
  }
  g.fillStyle = lin(g, 0, y - 9, 0, y - 1, [[0, PAL.coralDark], [0.35, shade(PAL.coral, 0.2)], [1, PAL.coralDark]]);
  g.fillRect(0, y - 9, w, 8);
  g.fillStyle = PAL.cream;
  g.fillRect(0, y + rows * s, w, 2);
}
