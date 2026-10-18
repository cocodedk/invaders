// The trailer's film look, drawn from the film state (src/fx/film.js): colour grade toward the
// world's tint, vignette, grain (cached noise tiles, one per film frame) and letterbox bars.
// quality: the view's auto-quality level; at 0.5 the grain is skipped (R46).
import { W, H, cached, hash } from './sprites.js';

const BAR = 138; // px per bar at full letterbox: 1920 x 804 inside, about 2.39 : 1
const TILES = 4;
const TILE = 256;

const vignette = () => cached('vignette', W, H, (g) => {
  const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.95)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
});

const grainTile = (i) => cached('grain' + i, TILE, TILE, (g) => {
  const img = g.createImageData(TILE, TILE);
  for (let p = 0; p < TILE * TILE; p++) {
    const v = hash(p * 7 + i * 104729) * 255;
    img.data[p * 4] = v;
    img.data[p * 4 + 1] = v;
    img.data[p * 4 + 2] = v;
    img.data[p * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
});

export function drawFilm(ctx, film, quality = 1) {
  if (!film || film.k <= 0) return;
  if (film.grade > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = film.grade;
    ctx.fillStyle = film.tint;
    ctx.fillRect(0, 0, W, H);
  }
  if (film.grain > 0 && quality >= 1) {
    const tile = grainTile((film.seed + film.frame) % TILES);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = film.grain;
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    const ox = hash(film.frame) * TILE;
    ctx.translate(-ox, 0);
    ctx.fillRect(ox, 0, W, H);
    ctx.translate(ox, 0);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = film.vignette;
  ctx.drawImage(vignette(), 0, 0);
  ctx.globalAlpha = 1;
  const bar = BAR * film.letterbox;
  if (bar > 0.5) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
  }
}
