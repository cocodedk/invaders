// Enemy bullets by pattern, in the world's colours: round orbs (or the world's own style: blaster
// bolts, the cabinet's zigzags), drops for rain, pulsing seekers for homing, spinning throwing
// stars, acid. Lasers are in lasers-view.js. One glow + one body sprite per bullet; at half quality
// the glow is skipped.
import { glow, hash } from './sprites.js';
import { orb, capsule, zigzag, shuriken } from './bullet-sprites.js';

function rotated(ctx, m, x, y, vx, vy, sprite) {
  ctx.setTransform(m);
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx) + Math.PI / 2);
  ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
}

export function drawBullets(ctx, world, look, t, quality = 1) {
  const { enemy, enemyRim: rim } = look.palette;
  const list = world.bullets;
  if (quality >= 1) { // glows under everything, in one additive pass
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75;
    const g = glow(enemy);
    for (const b of list) {
      if (b.pattern === 'laser') continue;
      const r = b.r * (b.pattern === 'shuriken' ? 2.2 : 2.8);
      ctx.drawImage(b.pattern === 'acid' ? glow('#b8ff3a') : g, b.x - r, b.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  const m = ctx.getTransform();
  const style = look.bullet;
  const ball = orb(enemy, rim, 8);
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const p = b.pattern;
    if (p === 'laser') continue;
    if (p === 'shuriken') {
      const s = shuriken(enemy);
      ctx.setTransform(m);
      ctx.translate(b.x, b.y);
      ctx.rotate(t * 9 + hash(i) * 6);
      ctx.drawImage(s, -24 * (b.r / 18), -24 * (b.r / 18), 48 * (b.r / 18), 48 * (b.r / 18));
    } else if (p === 'rain') rotated(ctx, m, b.x, b.y, b.vx, b.vy, capsule(enemy, rim, 26, 9));
    else if (p === 'acid') rotated(ctx, m, b.x, b.y, b.vx, b.vy || 1, capsule('#a6ff3a', '#0a1a04', 22, 12));
    else if (p === 'homing') {
      const pulse = 1 + 0.18 * Math.sin(t * 12 + i);
      const s = orb(enemy, rim, 10);
      ctx.drawImage(s, b.x - s.width / 2 * pulse, b.y - s.height / 2 * pulse, s.width * pulse, s.height * pulse);
    } else if (style === 'bolt') rotated(ctx, m, b.x, b.y, b.vx, b.vy, capsule(enemy, rim, 28, 9));
    else if (style === 'pixel') {
      const z = zigzag(enemy, rim, Math.floor(t * 10 + i) & 1);
      ctx.drawImage(z, b.x - 10, b.y - 18);
    } else ctx.drawImage(ball, b.x - ball.width / 2, b.y - ball.height / 2);
  }
  ctx.setTransform(m);
}
