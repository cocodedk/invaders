// The far layer of Rubber Regatta (bathtaps; parallax-bath.js registers it): the far end of the tub, at toy scale. Two brass dolphin
// taps as tall as towers stand on its rolled far rim (parallax-bath-dolphin.js), each pouring a thin waterfall from its dolphin's mouth
// into the water; behind them, along the wall at dado height, runs a mosaic frieze of leaping fish in coral and cream
// (parallax-bath-frieze.js). Above the frieze only the taps stand against the tiles, so nothing pale is behind the alien rows. Each
// tap's dome glints and each waterfall's foot flickers (out.lights). The painter takes the layer's seeded rng, and it bakes the
// flourishes' and the ambient's sprites (warmBathFx), so no frame of the fight pays for one.
import { rgba, lin, soft } from './sprites.js';
import { PAL } from './sky-bodies-11-kit.js';
import { RIM, WATER_Y, TAPS, mouthOf, BEND } from './parallax-bath-kit.js';
import { frieze } from './parallax-bath-frieze.js';
import { tap } from './parallax-bath-dolphin.js';
import { warmBathFx } from './flourish-bath-sprites.js';

// The tub's far rim, rolled enamel catching the window's light, and the water beyond it (mostly behind the nearer layers).
function rimAndWater(g, w, h, rng) {
  g.fillStyle = lin(g, 0, WATER_Y, 0, h, [[0, PAL.water.mid], [0.4, PAL.water.lo], [1, PAL.water.lo]]);
  g.fillRect(0, WATER_Y, w, h - WATER_Y);
  for (let i = 0; i < 16; i++) { // the tiles' green and the light, broken on the water
    g.globalAlpha = 0.35;
    g.drawImage(soft(i % 3 ? PAL.wall.light : PAL.water.hi), rng() * w - 120, WATER_Y + 8 + rng() * 60, 240, 14);
  }
  g.globalAlpha = 1;
  for (const T of TAPS) { // each tap's brass, broken into wobbling bands on the water under it
    for (let k = 0; k < 8; k++) {
      g.globalAlpha = 0.5 - k * 0.055;
      g.drawImage(soft(k % 2 ? PAL.brass.light : PAL.brass.body), T.x - 40 + Math.sin(k * 1.9) * 8, WATER_Y + 2 + k * 8, 80 - k * 4, 7);
    }
    g.globalAlpha = 1;
  }
  g.lineWidth = 1.5; // ripples, each a pale line over a dark one
  for (let i = 0; i < 46; i++) {
    const [x, y, r] = [rng() * w, WATER_Y + 12 + rng() * 80, 16 + rng() * 40];
    for (const [c, a, dy] of [[PAL.wall.dark, 0.22, 2], ['#ffffff', 0.4, 0]]) {
      g.strokeStyle = rgba(c, a);
      g.beginPath();
      g.ellipse(x, y + dy, r, 2.5, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  }
  g.fillStyle = lin(g, 0, WATER_Y, 0, WATER_Y + 20, [[0, rgba(PAL.wall.dark, 0.32)], [1, rgba(PAL.wall.dark, 0)]]); // the rim's shadow
  g.fillRect(0, WATER_Y, w, 20);
  g.fillStyle = lin(g, 0, RIM.y, 0, RIM.y + RIM.h, [[0, PAL.enamel.hi], [0.35, PAL.enamel.mid], [1, PAL.enamel.lo]]);
  g.fillRect(0, RIM.y, w, RIM.h);
  g.fillStyle = rgba('#ffffff', 0.85);
  g.fillRect(0, RIM.y + 5, w, 2);
  g.fillStyle = rgba(PAL.wall.dark, 0.3);
  g.fillRect(0, RIM.y + RIM.h - 3, w, 3);
}

// A thin waterfall from the dolphin's mouth to the water, carried a little outward, with streaks in it and a splash at its foot.
function waterfall(g, T, out, rng) {
  const [mx, my] = mouthOf(T);
  const [foot, bend] = [WATER_Y + 6, T.dir * BEND];
  g.fillStyle = lin(g, 0, my, 0, foot, [[0, rgba(PAL.water.hi, 0.82)], [1, rgba(PAL.water.hi, 0.5)]]);
  g.beginPath();
  g.moveTo(mx - 8, my);
  g.quadraticCurveTo(mx - 7 + bend, my + 40, mx - 5 + bend, foot);
  g.lineTo(mx + 5 + bend, foot);
  g.quadraticCurveTo(mx + 8 + bend, my + 40, mx + 8, my);
  g.fill();
  g.strokeStyle = rgba('#ffffff', 0.6);
  g.lineWidth = 1.2;
  for (const d of [-3, 2.5]) {
    g.beginPath();
    g.moveTo(mx + d, my + 4);
    g.quadraticCurveTo(mx + d + bend, my + 40, mx + d * 0.6 + bend, foot);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const r = 6 + rng() * 10;
    g.globalAlpha = 0.9;
    g.drawImage(soft(PAL.foam.hi), mx + bend + (rng() - 0.5) * 44 - r, foot - 2 - rng() * 10 - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
  out.lights.push({ x: mx + bend, y: foot - 6, r: 44, color: PAL.water.hi, mode: 'flicker', ph: rng(), a: 0.2 });
}

export function bathtaps(g, w, h, rng, L, out) {
  warmBathFx();
  g.save();
  frieze(g, w);
  rimAndWater(g, w, h, rng);
  for (const T of TAPS) tap(g, T, out, rng);
  for (const T of TAPS) waterfall(g, T, out, rng);
  g.restore();
}
