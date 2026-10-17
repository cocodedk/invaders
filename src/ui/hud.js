// Heads-up display in the 1920 x 1080 frame, sized like Barrage's to read from across a room:
// score and combo (top left; the meter pulses at x4 and burns at x8), the wave counter or the boss's
// health bar (top centre), lives and bombs (top right) and the power-up's timer ring beside them.
// hud = the view's HUD state { lag } (the boss bar's trailing damage).
import { W, rgba, shade, glow } from './sprites.js';
import { approach, clamp } from '../core/math.js';
import { COMBO_WINDOW, COMBO_MAX } from '../core/scoring.js';
import { POWER_TIME, BOMB_MAX } from '../core/powerups.js';
import { LIVES } from '../core/ship.js';
import { ENTER } from '../core/boss-move.js';
import { bossDef } from '../core/bosses-data.js';
import { WORLDS } from '../core/levels.js';
import { panel, text, label, shipIcon, bombIcon } from './hud-kit.js';
import { drawIcon } from './pickups-view.js';

function score(ctx, world) {
  panel(ctx, 32, 24, 360, 96);
  label(ctx, 'SCORE', 56, 50);
  text(ctx, world.score.toLocaleString('en-US'), 54, 90, 48, '#ffffff', 'left', 900);
}

function combo(ctx, world, t) {
  const { mult, timer } = world.combo;
  const hotK = mult >= COMBO_MAX ? 2 : mult >= 4 ? 1 : 0;
  const x = 404;
  if (hotK === 2) { // burning: flames licking up round the meter
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const fl = 0.6 + 0.4 * Math.sin(t * 17 + i * 2.1);
      ctx.globalAlpha = 0.5 * fl;
      ctx.drawImage(glow(i % 2 ? '#ff5a1a' : '#ffb03a'), x - 10 + i * 26, 6 - fl * 26, 44, 90);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  const color = hotK === 2 ? '#ff6a2a' : hotK === 1 ? '#ffe14a' : mult > 1 ? '#ffffff' : 'rgba(255,255,255,0.4)';
  panel(ctx, x, 24, 150, 96, hotK ? rgba(color, 0.95) : undefined);
  label(ctx, 'COMBO', x + 75, 50, 'center');
  const pulse = hotK ? 1 + (hotK === 2 ? 0.14 : 0.09) * Math.abs(Math.sin(t * (hotK === 2 ? 12 : 8))) : 1;
  ctx.save();
  ctx.translate(x + 75, 86);
  ctx.scale(pulse, pulse);
  text(ctx, `×${mult}`, 0, 0, 42, color, 'center', 900);
  ctx.restore();
  const f = clamp(timer / COMBO_WINDOW, 0, 1);
  if (mult > 1 && f > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 14, 112, 122 * f, 4);
  }
}

function wave(ctx, world, look) {
  const total = world.level.waves?.length ?? 0;
  const name = WORLDS[world.level.world - 1]?.name ?? '';
  panel(ctx, W / 2 - 150, 24, 300, 84);
  label(ctx, name.toUpperCase(), W / 2, 48, 'center', look.palette.accent);
  text(ctx, `WAVE ${Math.max(1, world.wave)} / ${total}`, W / 2, 82, 32, '#ffffff', 'center', 900);
}

function bossBar(ctx, world, look, hud) {
  const b = world.boss;
  const def = bossDef(b.kind);
  const fill = (b.hp / b.maxHp) * clamp(1 - b.enter / ENTER, 0, 1);
  hud.lag = approach(hud.lag ?? fill, fill, 0.004);
  if (hud.lag < fill) hud.lag = fill;
  const bw = 700;
  const x = W / 2 - bw / 2;
  panel(ctx, x - 24, 22, bw + 48, 92, rgba(look.palette.boss.weak, 0.7));
  label(ctx, def.name.toUpperCase(), W / 2, 48, 'center', shade(look.palette.boss.weak, 0.4));
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, 66, bw, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x, 66, bw * hud.lag, 26);
  const gr = ctx.createLinearGradient(0, 66, 0, 92);
  gr.addColorStop(0, shade(look.palette.boss.weak, 0.35));
  gr.addColorStop(1, shade(look.palette.boss.weak, -0.25));
  ctx.fillStyle = gr;
  ctx.fillRect(x, 66, bw * fill, 26);
  ctx.fillStyle = 'rgba(8,10,18,0.9)';
  for (const p of def.phases) if (p.until > 0) ctx.fillRect(x + bw * p.until - 2, 62, 4, 34);
}

function stock(ctx, world, look, t) {
  const s = world.ship;
  const x = W - 32 - 300;
  panel(ctx, x, 24, 300, 96);
  label(ctx, 'LIVES', x + 24, 50);
  label(ctx, 'BOMBS', x + 172, 50);
  for (let i = 0; i < LIVES; i++) shipIcon(ctx, x + 38 + i * 38, 88, look.palette.accent, i < s.lives);
  for (let i = 0; i < BOMB_MAX; i++) bombIcon(ctx, x + 186 + i * 36, 88, look.power.bomb, i < s.bombs);
  if (!s.power) return;
  const color = look.power[s.power.kind];
  const cx = x - 62;
  const k = clamp(s.power.left / POWER_TIME, 0, 1);
  const warn = s.power.left < 2 && Math.floor(t * 8) % 2;
  ctx.beginPath();
  ctx.arc(cx, 72, 44, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,10,18,0.7)';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(cx, 72, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = warn ? '#ffffff' : color;
  ctx.beginPath();
  ctx.arc(cx, 72, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, 72);
  drawIcon(ctx, s.power.kind, color);
  ctx.restore();
}

export function drawHud(ctx, world, look, hud, t) {
  ctx.textBaseline = 'middle';
  score(ctx, world);
  combo(ctx, world, t);
  if (world.boss) bossBar(ctx, world, look, hud);
  else wave(ctx, world, look);
  stock(ctx, world, look, t);
}
