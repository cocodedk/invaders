// STUB for Task 10, which replaces it with the eight bosses (bosses/<kind>.js).
// drawBoss(ctx, world, look, t) draws world.boss (null on wave levels) in world space, after the
// aliens. It receives the whole world: boss { kind, x, y, hp, maxHp, phase, parts, enter, dying,
// warns } with each part { id, x, y, w, h, hp, max, weak, armor, open, cracked } (absolute centre).
// Placeholder: a hull plate behind, then each part as a rounded block — weak points pulse, plates
// are riveted, bare hull is dull, dead parts are charred; telegraphs glow on their part.
import { INK, glow, roundRect, shade, rgba } from '../sprites.js';
import { bossDef } from '../../core/bosses-data.js';

function part(ctx, p, pal, t) {
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;
  const dead = p.hp <= 0;
  const color = dead ? '#1a1414' : p.weak ? pal.weak : p.armor ? pal.plate : shade(pal.hull, 0.15);
  if (p.weak && !dead) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 5 + p.x * 0.01);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 * pulse;
    const r = Math.max(p.w, p.h);
    ctx.drawImage(glow(pal.weak), p.x - r, p.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  roundRect(ctx, x, y, p.w, p.h, Math.min(14, p.h / 3));
  const gr = ctx.createLinearGradient(0, y, 0, y + p.h);
  gr.addColorStop(0, shade(color, dead ? 0 : 0.35));
  gr.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (dead || p.cracked) {
    ctx.strokeStyle = dead ? rgba('#ff5a1a', 0.5 + 0.3 * Math.sin(t * 9 + p.x)) : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + p.w * 0.2, y + p.h * 0.1);
    ctx.lineTo(x + p.w * 0.45, y + p.h * 0.55);
    ctx.lineTo(x + p.w * 0.35, y + p.h * 0.9);
    ctx.moveTo(x + p.w * 0.45, y + p.h * 0.55);
    ctx.lineTo(x + p.w * 0.8, y + p.h * 0.4);
    ctx.stroke();
  } else if (p.armor) {
    ctx.fillStyle = shade(color, -0.5);
    for (const [rx, ry] of [[0.12, 0.2], [0.88, 0.2], [0.12, 0.8], [0.88, 0.8]]) ctx.fillRect(x + p.w * rx - 2, y + p.h * ry - 2, 4, 4);
  } else if (p.weak) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.w * 0.18, p.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBoss(ctx, world, look, t) {
  const b = world.boss;
  if (!b) return;
  const pal = look.palette.boss;
  const { w, h } = bossDef(b.kind).size;
  const flicker = b.dying != null ? 0.65 + 0.35 * Math.sin(t * 40) : 1;
  ctx.globalAlpha = flicker;
  roundRect(ctx, b.x - w / 2, b.y - h / 2, w, h, 40);
  ctx.fillStyle = rgba(pal.hull, 0.92);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(shade(pal.plate, 0.3), 0.6);
  ctx.stroke();
  for (const p of b.parts) part(ctx, p, pal, t);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const wn of b.warns) {
    const p = b.parts.find((q) => q.id === wn.part);
    if (!p) continue;
    const k = 1 - wn.left / wn.total;
    const r = 30 + 70 * k;
    ctx.globalAlpha = 0.4 + 0.6 * k;
    ctx.drawImage(glow('#ff3a2a'), p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
