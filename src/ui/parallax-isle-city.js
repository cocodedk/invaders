// The far layer of Golden Isle (islecity): the island city on its three-peaked mountain. Gilded walls run in tiers across the slopes,
// stepped temple towers rise over them, lit gold on the side toward the low sun; part of the city burns, its towers' tops in flame
// (out.lights) where the sky's smoke rises (ISLE.fires, sky-bodies-13.js). The mountain is a dark mass warmed on the sun's side; the
// gold sits under the alien rows.
import { lin, shade, rgba } from './sprites.js';
import { profile } from './parallax-kit.js';
import { PAL, ISLE, MARGIN } from './isle-kit.js';

export const TEMPLE = { w: [50, 90], steps: [4, 6], step: 22, pitch: [70, 150] }; // a tower's width, its steps, a step's height, the spacing

// The mountain's top edge at x: the highest of the three peaks' slopes there.
const ridge = (h) => (x) => h - Math.max(0, ...ISLE.peaks.map(([px, ph]) => ph * Math.max(0, 1 - Math.abs(x - px) / ISLE.spread) ** 1.3 + 6 * Math.sin(x * 0.07)));

const gilt = (g, x0, x1) => lin(g, x0, 0, x1, 0, [[0, shade(PAL.goldDeep, -0.35)], [0.55, PAL.goldDeep], [1, PAL.gold]]); // lit from the right

function wall(g, x0, x1, y) {
  g.fillStyle = gilt(g, x0, x1);
  g.fillRect(x0, y, x1 - x0, 24);
  for (let x = x0 + 4; x < x1 - 8; x += 16) g.fillRect(x, y - 7, 8, 7); // the battlements
  g.fillStyle = rgba(PAL.smoke, 0.5);
  g.fillRect(x0, y + 18, x1 - x0, 6);
  g.fillStyle = rgba(PAL.goldPale, 0.35);
  g.fillRect(x0, y, x1 - x0, 2); // the light along its coping
}

// A stepped temple tower standing on (x, base): each step narrower than the one below, a rounded crown on top.
function temple(g, x, base, w, steps) {
  const { step } = TEMPLE;
  for (let k = 0; k < steps; k++) {
    const sw = w * (1 - k / (steps + 1));
    g.fillStyle = gilt(g, x - sw / 2, x + sw / 2);
    const y = base - (k + 1) * step;
    g.fillRect(x - sw / 2, y, sw, step - 2);
    g.fillStyle = rgba(PAL.goldPale, 0.4);
    g.fillRect(x - sw / 2, y, sw, 2); // each step's lit edge
    g.fillStyle = rgba(PAL.smoke, 0.55); // and its niches, dark under little arches
    for (let n = x - sw / 2 + 8; n < x + sw / 2 - 8; n += 14) {
      g.beginPath();
      g.ellipse(n + 3, y + 9, 3, 4, 0, Math.PI, 0);
      g.fillRect(n, y + 9, 6, step - 13);
      g.fill();
    }
  }
  g.fillStyle = gilt(g, x - w / 2, x + w / 2);
  const top = base - steps * step;
  g.beginPath();
  g.ellipse(x, top - 6, w * 0.16, 10, 0, Math.PI, 0);
  g.fill();
  return top - 14;
}

// A tower on fire: flames licking up from its crown, its glow flickering (the smoke is the sky's).
function burn(g, x, crown, w, rng, out) {
  for (let k = 0; k < 5; k++) {
    const fx = x + (k - 2) * w * 0.12;
    const fh = 14 + rng() * 22;
    g.fillStyle = k % 2 ? PAL.ember : PAL.flame;
    g.beginPath();
    g.ellipse(fx, crown + 10 - fh / 2, 5 + rng() * 3, fh / 2, 0, 0, Math.PI * 2);
    g.fill();
  }
  out.lights.push({ x, y: crown, r: 40, color: PAL.ember, mode: 'flicker', ph: rng(), a: 0.45 });
}

export function islecity(g, w, h, rng, L, out) {
  g.save();
  const top = ridge(h);
  g.fillStyle = L.color;
  profile(g, w, h, top);
  g.globalCompositeOperation = 'source-atop'; // the flank toward the sun, warmed
  g.fillStyle = lin(g, 0, 0, w, 0, [[0, rgba(PAL.crimson, 0)], [0.55, rgba(PAL.crimson, 0.12)], [0.7, rgba(PAL.ember, 0.22)], [1, rgba(PAL.ember, 0.1)]]);
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  const fires = ISLE.fires.map((x) => x + MARGIN);
  for (const ty of ISLE.tiers) {
    let x0 = null;
    for (let x = 0; x <= w; x += 8) {
      const on = top(x) < ty - 30;
      if (on && x0 === null) x0 = x;
      if ((!on || x === w) && x0 !== null) {
        if (x - x0 > 60) {
          wall(g, x0, x, ty);
          const [w0, w1] = TEMPLE.w;
          const [p0, p1] = TEMPLE.pitch;
          for (let tx = x0 + 30 + rng() * 40; tx < x - 30; tx += p0 + rng() * (p1 - p0)) {
            const tw = w0 + rng() * (w1 - w0);
            const f = fires.findIndex((fx) => Math.abs(fx - tx) < p1 / 2);
            const at = f >= 0 ? fires.splice(f, 1)[0] : tx; // a burning tower stands right under its smoke
            const crown = temple(g, at, ty - 7, tw, TEMPLE.steps[0] + Math.floor(rng() * (TEMPLE.steps[1] - TEMPLE.steps[0] + 1)));
            if (f >= 0) {
              burn(g, at, crown, tw, rng, out);
            } else out.lights.push({ x: tx, y: crown + 4, r: 14, color: PAL.gold, mode: 'pulse', ph: rng(), a: 0.2 });
          }
        }
        x0 = null;
      }
    }
  }
  g.restore();
}
