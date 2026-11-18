// World 20's ship (ship-view.js draws it in place of the chrome hull, in the ship's own banked frame): a FOLDED PAPER DART seen from
// above, nose up, in the hall's colours: two cream wings (the right one in the shade of its fold), the keel folded under them, a
// vermilion printed rule along each wing and an inked steel nib on its nose with its slit and breather hole. It has no engine, so no
// flames. The carbon copy of the echo (core/echo.js) is the same dart traced in faint carbon blue, drawn where world.twist.copy stands,
// and not at all while there is none. Both are baked once; per frame each is one drawImage, no shadow blur.
import { cached, rgba } from './sprites.js';
import { PAL, CARBON } from './press-kit.js';

export const DART = 112; // px, the baked dart's canvas
export const COPY_ALPHA = 0.55; // how faint the carbon tracing is drawn
const NOSE = -46; // px, the nose's y in the ship's frame
const [TIP_X, TIP_Y] = [40, 24]; // a wing tip, where the hull's wing lights are
const [FOLD_X, FOLD_Y, TAIL] = [7, 17, 32]; // where a wing meets the keel, and the keel's tail
const NIB = [[0, NOSE - 2], [5, -30], [0, -25], [-5, -30]];

function poly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

// The dart in the colours c: { face, fold, keel, line, rule, nib, slit }.
function paint(g, c) {
  g.lineJoin = 'round';
  g.lineWidth = 2;
  g.strokeStyle = c.line;
  poly(g, [[0, NOSE], [0, TAIL], [-FOLD_X, FOLD_Y], [FOLD_X, FOLD_Y], [0, TAIL]]); // the keel under the wings
  g.fillStyle = c.keel;
  g.fill();
  g.stroke();
  for (const s of [-1, 1]) {
    poly(g, [[0, NOSE], [s * TIP_X, TIP_Y], [s * FOLD_X, FOLD_Y]]);
    g.fillStyle = s < 0 ? c.face : c.fold;
    g.fill();
    g.stroke();
  }
  g.beginPath(); // the centre crease
  g.moveTo(0, NOSE);
  g.lineTo(0, TAIL);
  g.stroke();
  g.lineWidth = 2.5; // the printed rules
  g.strokeStyle = c.rule;
  g.beginPath();
  for (const s of [-1, 1]) {
    g.moveTo(s * 9, -6);
    g.lineTo(s * 30, 17);
  }
  g.stroke();
  poly(g, NIB); // the nib, its slit and its breather hole
  g.fillStyle = c.nib;
  g.fill();
  g.lineWidth = 0.9;
  g.strokeStyle = c.slit;
  g.beginPath();
  g.moveTo(0, NOSE);
  g.lineTo(0, -31);
  g.stroke();
  g.beginPath();
  g.arc(0, -30, 1.6, 0, Math.PI * 2);
  g.fillStyle = c.rule;
  g.fill();
}

const bake = (key, c) => cached(key, DART, DART, (g) => {
  g.translate(DART / 2, DART / 2);
  paint(g, c);
});

export const dartSprite = (accent) =>
  bake('pressDart' + accent, { face: PAL.paper, fold: PAL.paperShade, keel: '#a8987a', line: PAL.ink, rule: accent, nib: PAL.ink, slit: PAL.paper });

export const carbonSprite = () =>
  bake('pressCarbon', { face: rgba(CARBON, 0.16), fold: rgba(CARBON, 0.26), keel: rgba(CARBON, 0.34), line: CARBON, rule: CARBON, nib: CARBON, slit: rgba(CARBON, 0) });

// The dart in the ship's frame (centre at the origin); the wing tips' share of the hull's 38 px.
export function drawDart(ctx, bank, accent) {
  ctx.drawImage(dartSprite(accent), -DART / 2, -DART / 2);
  const k = 1 - 0.14 * Math.abs(bank);
  return [k, k];
}

// The carbon copy, faint, where the echo state says it stands; nothing while there is no copy.
export function drawCopy(ctx, world) {
  const c = world.twist?.copy;
  if (!c) return;
  ctx.globalAlpha = COPY_ALPHA;
  ctx.drawImage(carbonSprite(), c.x - DART / 2, c.y - DART / 2);
  ctx.globalAlpha = 1;
}
