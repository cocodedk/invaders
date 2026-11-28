// A closed lasso loop's outline (fx.loops, fx/react-road.js lasso), stroked solid in dark gold over the parchment and fading with its life.
// Source-over: additive light does not show on cream. Pure reads of fx.
export const LOOP_FLASH_COLOUR = '#c8901f'; // dark gold, reads on parchment (the lantern's deep gold)
export const LOOP_FLASH_WIDTH = 9; // px

export function drawLoopFlash(ctx, fx) {
  for (const l of fx.loops) {
    const n = Math.floor(l.poly.length / 2);
    if (n < 2) continue;
    ctx.globalAlpha = l.life / l.max;
    ctx.strokeStyle = LOOP_FLASH_COLOUR;
    ctx.lineWidth = LOOP_FLASH_WIDTH;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(l.poly[0], l.poly[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(l.poly[2 * i], l.poly[2 * i + 1]);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
