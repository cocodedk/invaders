// The sky of world 9 (see sky-bodies.js for the contract).
import { W, glow, addGlow, rgba } from './sprites.js';
import { blobs, brush, horizonGlow } from './sky-paint.js';

// Tidal Siege: a storm over the harbour. A moon behind the cloud as a pale smear, banks of cloud in
// long dark strokes, the horizon lit green-teal from beneath by something in the water.
function stormsea(g) {
  addGlow(g, glow('#9fe8dc'), 1460, 230, 420, 0.3);
  addGlow(g, glow('#d8fff6'), 1460, 230, 120, 0.35);
  blobs(g, [
    [300, 120, 640, '#02080e', 0.7, 0.4], [1000, 90, 760, '#03090f', 0.75, 0.38], [1700, 140, 620, '#02080e', 0.7, 0.4],
    [600, 420, 800, '#0a2a2e', 0.4, 0.3], [1500, 460, 900, '#0c3236', 0.4, 0.3],
  ]);
  const banks = [
    [-60, 170, 1100, 44], [700, 120, 1000, 52], [1300, 250, 800, 40], [100, 330, 900, 34],
    [900, 380, 1000, 40], [1400, 150, 600, 30], [-120, 470, 800, 30], [1100, 540, 900, 26],
  ];
  banks.forEach(([x, y, len, wd], i) => brush(g, x, y, len, wd, rgba('#02060a', 0.78 - (i % 3) * 0.1), i + 7));
  for (let i = 0; i < 3; i++) addGlow(g, glow('#9fe8dc'), W * (0.2 + i * 0.3), 300 + i * 60, 600, 0.05, 0.22); // moonlit edges
  horizonGlow(g, '#2fd0b0', 0.4, 480);
}

export const BODIES3 = { stormsea };
