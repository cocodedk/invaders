// The ship's shots in Midnight Press (world 20; lasers-view.js hands the plain ones here instead of drawing streaks): every shot is an
// INK STROKE, a brush stroke of vermilion ink with a round loaded head and a tail that thins away behind it, an ink-black edge and a
// cream glint down its head, flying head first along its own flight. The carbon copy's shots (marked `echo`, core/echo.js) are the
// same stroke in carbon blue, so they read apart at once. Both are baked once; a frame draws one sprite a shot, no shadow blur.
import { cached, rgba, lin } from './sprites.js';
import { PAL, CARBON, CARBON_PALE } from './press-kit.js';

export const [STROKE_W, STROKE_H] = [16, 52]; // px, a stroke's sprite
export const HEAD = 8; // px from the sprite's top to where the shot is

const stroke = (body, light) => cached('inkStroke' + body, STROKE_W, STROKE_H, (g) => {
  const mid = STROKE_W / 2;
  g.beginPath();
  g.moveTo(mid, 2);
  g.bezierCurveTo(mid + 7, 3, mid + 6, 14, mid + 4, 22);
  g.quadraticCurveTo(mid + 1.5, 38, mid, STROKE_H - 2);
  g.quadraticCurveTo(mid - 1.5, 38, mid - 4, 22);
  g.bezierCurveTo(mid - 6, 14, mid - 7, 3, mid, 2);
  g.closePath();
  g.fillStyle = lin(g, 0, 0, 0, STROKE_H, [[0, body], [0.5, body], [1, rgba(body, 0.25)]]);
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = PAL.ink;
  g.lineJoin = 'round';
  g.stroke();
  g.beginPath(); // the glint
  g.moveTo(mid - 1.5, 6);
  g.quadraticCurveTo(mid - 3, 13, mid - 2, 21);
  g.lineWidth = 1.4;
  g.lineCap = 'round';
  g.strokeStyle = rgba(light, 0.85);
  g.stroke();
});

export const inkSprite = () => stroke(PAL.vermilion, PAL.paper);
export const carbonShotSprite = () => stroke(CARBON, CARBON_PALE);

// Every plain shot in shots (a side shot, a trident or a mirror bolt is drawn by its own file), as a stroke: the copy's blue.
export function drawInk(ctx, shots) {
  for (const p of shots) {
    if (p.broadside || p.trident || p.mirror) continue;
    const img = p.echo ? carbonShotSprite() : inkSprite();
    if (!p.vx) {
      ctx.drawImage(img, p.x - STROKE_W / 2, p.y - HEAD);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
    ctx.drawImage(img, -STROKE_W / 2, -HEAD);
    ctx.restore();
  }
}
