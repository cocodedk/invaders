// The auto-fire sign: a small pill on the right of the score panel's caption row (the one spot of the HUD's top
// band that no state of the game uses: the boss bar, the power rings and the stock panel fill the rest), in the
// world's accent colour, while F has auto-fire on. hud.js draws it when the view's HUD state says so.
//   autofireSign(ctx, right, y, color)   right: x of the pill's right edge, y: the caption row's middle
import { INK, roundRect } from './sprites.js';
import { label } from './hud-kit.js';

export const AUTOFIRE_SIGN = 'AUTO-FIRE';
const PILL_W = 142;
const PILL_H = 26;

export function autofireSign(ctx, right, y, color) {
  roundRect(ctx, right - PILL_W, y - PILL_H / 2, PILL_W, PILL_H, PILL_H / 2);
  ctx.fillStyle = color;
  ctx.fill();
  label(ctx, AUTOFIRE_SIGN, right - PILL_W / 2 + 1.5, y + 1, 'center', INK); // +1.5: the last letter's spacing trails it
}
