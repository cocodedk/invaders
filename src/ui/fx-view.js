// Drawing the fx state (src/fx) in world space (adapted from Barrage): particles by kind, shockwave
// rings by kind, local flashes, and floating score text. Pure reads of fx; nothing is changed here.
// Full-frame flashes, glitch slices and tints are screen-view.js.
import { INK, rgba, glow, soft } from './sprites.js';

function plain(ctx, p) {
  const f = p.life / p.max;
  const s = p.size;
  if (p.kind === 'smoke' || p.kind === 'dust') {
    ctx.globalAlpha = f * (p.kind === 'smoke' ? 0.55 : 0.6);
    ctx.drawImage(soft(p.color), p.x - s * 1.4, p.y - s * 1.4, s * 2.8, s * 2.8);
    return;
  }
  ctx.globalAlpha = Math.min(1, f * 3);
  ctx.fillStyle = p.color;
  if (p.kind === 'debris') { // tumbling chips: the box turns with the particle's age
    const a = (p.max - p.life) * 9 + p.vx * 0.01;
    const w = s * (0.6 + 0.4 * Math.abs(Math.cos(a)));
    ctx.fillRect(p.x - w / 2, p.y - s / 2, w, s);
    return;
  }
  ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
}

function hot(ctx, p) {
  const f = p.life / p.max;
  ctx.globalAlpha = f;
  if (p.kind === 'spark') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, p.size);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
    ctx.stroke();
    return;
  }
  const r = p.size * 4;
  ctx.drawImage(glow(p.color), p.x - r, p.y - r, r * 2, r * 2);
}

function rings(ctx, fx) {
  for (const r of fx.rings) {
    const f = r.life / r.max;
    const inward = r.kind === 'lens' || r.kind === 'charge';
    const a = inward ? 1 - f * 0.5 : f;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(r.color, 0.25 * a);
    ctx.lineWidth = r.width * 1.5 + 18 * a;
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(1, r.r), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(r.kind === 'lens' ? '#ffffff' : r.color, 0.9 * a);
    ctx.lineWidth = Math.max(1.5, r.width * a);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
}

function flashes(ctx, fx) {
  ctx.globalCompositeOperation = 'lighter';
  for (const f of fx.flashes) {
    if (f.full) continue;
    const k = f.ramp ? 1 - f.life / f.max : f.life / f.max;
    ctx.globalAlpha = Math.min(1, k * f.alpha);
    ctx.drawImage(glow(f.color), f.x - f.r * 1.6, f.y - f.r * 1.6, f.r * 3.2, f.r * 3.2);
    ctx.drawImage(glow('#ffffff'), f.x - f.r * 0.6, f.y - f.r * 0.6, f.r * 1.2, f.r * 1.2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// Pop-ups never rise above this line, so the HUD (panels end at y 96) never covers one.
const POPUP_MIN_Y = 150;

export function drawPopups(ctx, fx) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const p of fx.popups) {
    const age = p.max - p.life;
    const pop = 1 + Math.max(0, 1 - age / 0.18) * 0.6;
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2.5);
    ctx.font = `900 ${Math.round(30 * p.scale * pop)}px system-ui, sans-serif`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    const y = Math.max(POPUP_MIN_Y, p.y);
    ctx.strokeText(p.text, p.x, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, y);
  }
  ctx.globalAlpha = 1;
}

// World space, over the ships and bullets.
export function drawFx(ctx, fx) {
  for (const p of fx.particles) if (!p.additive) plain(ctx, p);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.particles) if (p.additive) hot(ctx, p);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  flashes(ctx, fx);
  rings(ctx, fx);
}
