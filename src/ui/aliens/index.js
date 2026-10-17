// STUB for Task 9, which replaces it with each world's own sprites (aliens/w1.js .. w8.js).
// drawAliens(ctx, world, look, t) draws everything alien-shaped on the playfield:
//   world.aliens (formation and boss minions), world.saucer (the bonus carrier, or null) and
//   world.wrecks (armored wrecks waiting to reassemble).
// Called in world space after the bunkers and pickups, before the boss. Placeholder shapes, one per
// role in look.palette.alien colours, pre-rendered (2 animation frames) into cached canvases.
import { INK, cached, glow, rgba, shade } from '../sprites.js';

const SIZE = 64;

function body(g, role, color, frame) {
  g.fillStyle = color;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.beginPath();
  if (role === 'grunt') { // a dome with legs that step
    g.arc(0, -2, 16, Math.PI, 0);
    g.lineTo(16, 8);
    for (let i = 0; i < 4; i++) {
      const x = 12 - i * 8;
      g.lineTo(x, 8 + (frame ^ (i & 1) ? 10 : 6));
      g.lineTo(x - 4, 8);
    }
    g.lineTo(-16, 8);
  } else if (role === 'diver') { // a dart pointing down, wings swept
    g.moveTo(0, 22);
    g.lineTo(20, -10 - frame * 4);
    g.lineTo(6, -6);
    g.lineTo(0, -18);
    g.lineTo(-6, -6);
    g.lineTo(-20, -10 - frame * 4);
  } else if (role === 'gunner') { // a wide crab with a gun beneath
    g.moveTo(-22, -4);
    g.lineTo(-12, -14);
    g.lineTo(12, -14);
    g.lineTo(22, -4);
    g.lineTo(26, frame ? -16 : 6);
    g.lineTo(18, 6);
    g.lineTo(5, 8);
    g.lineTo(5, 20);
    g.lineTo(-5, 20);
    g.lineTo(-5, 8);
    g.lineTo(-18, 6);
    g.lineTo(-26, frame ? -16 : 6);
  } else if (role === 'armored') { // a plated hexagon
    for (let i = 0; i < 6; i++) g.lineTo(Math.cos((i * Math.PI) / 3) * 22, Math.sin((i * Math.PI) / 3) * 20);
  } else { // carrier: an orb in a ring
    g.arc(0, 0, 15, 0, Math.PI * 2);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = rgba('#ffffff', 0.35);
  g.fillRect(-10, -12, 20, 3);
  if (role === 'carrier') {
    g.strokeStyle = shade(color, 0.5);
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, 0, 26, 8, frame ? 0.3 : -0.3, 0, Math.PI * 2);
    g.stroke();
  }
  if (role === 'armored') {
    g.strokeStyle = shade(color, -0.45);
    g.lineWidth = 2;
    g.strokeRect(-11, -9, 22, 18);
  }
  g.fillStyle = role === 'carrier' ? '#ffffff' : INK;
  for (const x of [-6, 6]) g.fillRect(x - 3, -4, 6, 6);
  g.fillStyle = '#ffffff';
  for (const x of [-6, 6]) g.fillRect(x - 1, -3, 2, 2);
}

const sprite = (role, color, frame) => cached(`alien${role}${color}${frame}`, SIZE, SIZE, (g) => {
  g.translate(SIZE / 2, SIZE / 2);
  body(g, role, color, frame);
});

function saucer(ctx, s, color, t) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6;
  ctx.drawImage(glow(color), s.x - 70, s.y - 40, 140, 80);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = shade(color, 0.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y - 6, 14, 12, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 36, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const on = Math.floor(t * 8 + i) % 5 === 0;
    ctx.fillStyle = on ? '#ffffff' : INK;
    ctx.fillRect(s.x - 22 + i * 11 - 2, s.y - 2, 4, 4);
  }
}

function wreck(ctx, w, look, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * (6 + (2 - w.left) * 6));
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 * pulse;
  ctx.drawImage(glow('#ff3a1a'), w.x - 36, w.y - 36, 72, 72);
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sprite('armored', shade(look.palette.alien.armored, -0.5), 0), w.x - SIZE / 2, w.y - SIZE / 2 + 6);
  ctx.globalAlpha = 1;
}

export function drawAliens(ctx, world, look, t) {
  const colors = look.palette.alien;
  const list = world.saucer ? [...world.aliens, world.saucer] : world.aliens;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.32;
  for (const a of list) ctx.drawImage(glow(colors[a.role]), a.x - 44, a.y - 44, 88, 88);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const w of world.wrecks) wreck(ctx, w, look, t);
  for (const a of world.aliens) {
    const frame = Math.floor(t * 2 + a.id * 0.37) & 1;
    ctx.drawImage(sprite(a.role, colors[a.role], frame), a.x - SIZE / 2, a.y - SIZE / 2);
  }
  if (world.saucer) saucer(ctx, world.saucer, colors.carrier, t);
}
