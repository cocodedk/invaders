// The middle layer of Midnight Press (presslines): sheets hanging to dry on lines strung between posts, two rows of them, each sheet
// pegged at the top and billowing like a sail, its print in ink with now and then a heading in vermilion; bundles of paper stacked on the
// floor beneath. A lamp hangs from the top of each post (out.lights). The layer stands below the alien rows, so the paper may be pale.
import { rgba, lin } from './sprites.js';
import { PAL } from './press-kit.js';

export const LINES = { rows: [70, 190], sag: 30, post: 40, pitch: 76 }; // the two lines' heights at the posts, their sag, the posts' tops, sheet pitch

function sheet(g, x, y, sw, sh, rng) {
  const billow = (rng() - 0.5) * 20;
  g.fillStyle = lin(g, x, y, x + sw, y + sh, [[0, PAL.paper], [1, PAL.paperShade]]);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + sw, y);
  g.quadraticCurveTo(x + sw + billow, y + sh / 2, x + sw, y + sh);
  g.lineTo(x, y + sh);
  g.quadraticCurveTo(x + billow, y + sh / 2, x, y);
  g.fill();
  g.fillStyle = rgba(PAL.vermilion, 0.8);
  if (rng() < 0.3) g.fillRect(x + 8, y + 10, sw * 0.5, 5);
  g.fillStyle = rgba(PAL.ink, 0.4);
  for (let r = 22; r < sh - 8; r += 8) g.fillRect(x + 8, y + r, sw - 16 - rng() * 10, 2);
  g.fillStyle = PAL.wood; // the peg
  g.fillRect(x + sw / 2 - 3, y - 6, 6, 12);
}

export function presslines(g, w, h, rng, L, out) {
  g.save();
  const posts = [];
  for (let x = 20; x < w + 400; x += 460 + rng() * 120) posts.push(x);
  for (let i = 0; i + 1 < posts.length; i++) {
    const [a, b] = [posts[i], posts[i + 1]];
    for (const row of LINES.rows) {
      const at = (x) => row + LINES.sag * 4 * ((x - a) / (b - a)) * (1 - (x - a) / (b - a));
      g.strokeStyle = rgba(PAL.paperShade, 0.6);
      g.lineWidth = 2;
      g.beginPath();
      for (let x = a; x <= b; x += 10) g.lineTo(x, at(x));
      g.stroke();
      for (let x = a + 24; x < b - 60; x += LINES.pitch + rng() * 16) sheet(g, x, at(x), 48 + rng() * 14, 72 + rng() * 36, rng);
    }
  }
  g.fillStyle = L.color;
  for (const x of posts) {
    g.fillRect(x - 7, LINES.post, 14, h - LINES.post);
    out.lights.push({ x: Math.min(w, x), y: LINES.post, r: 24, color: PAL.lamp, mode: 'flicker', ph: rng(), a: 0.22 });
  }
  for (let x = rng() * 120; x < w; x += 200 + rng() * 160) { // bundles of paper on the floor
    let y = h;
    for (let k = 0; k < 2 + rng() * 4; k++) {
      const [bw, bh] = [90 + rng() * 40, 22 + rng() * 10];
      y -= bh;
      g.fillStyle = L.color;
      g.fillRect(x + (rng() - 0.5) * 10, y, bw, bh);
      g.fillStyle = rgba(PAL.paperShade, 0.35); // the paper's edge
      g.fillRect(x + 4, y + bh / 2, bw - 8, 2);
    }
  }
  g.restore();
}
