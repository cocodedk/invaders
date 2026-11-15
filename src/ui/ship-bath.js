// World 19's ship (ship-view.js draws it in place of the chrome hull, in the ship's own banked frame): a small WOODEN TOY SEAPLANE seen from
// above, nose up. A fuselage of bare pine with its grain, a red rubber nose cone, a straight wing and a tailplane painted cream with the
// red of the nose on their tips and a stripe, two wooden pontoon floats with a red band under the wing, a peg-doll pilot in goggles in the
// cockpit, and a wooden propeller turning in a blur in front of the nose (the plane's engine: it has no flames). The plane is baked once
// per accent (warmed by warm-bath.js); per frame only the propeller is drawn, two short paths. Its wing tips sit where the hull's lights do.
import { INK, cached, rgba, lin, rad, shade, mix } from './sprites.js';
import { TAU } from '../core/math.js';
import { PINE, CREAM } from './bath-kit.js';

export const PLANE = 112; // px, the baked plane's canvas
export const PROP_SPIN = 47; // rad/s the propeller turns
const PROP = [0, -46, 21]; // x, y and half-span of the propeller

const ink = (g, fill, w = 2) => {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = w;
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.stroke();
};

function rounded(g, x0, y0, x1, y1, r) {
  g.beginPath();
  g.roundRect(x0, y0, x1 - x0, y1 - y0, r);
}

// The two floats under the wing, wooden pontoons with round bows and square sterns, a keel line and a red band round each.
function floats(g, accent) {
  for (const s of [-1, 1]) {
    const x = s * 17;
    const hull = () => {
      g.beginPath();
      g.moveTo(x - 7, -12);
      g.bezierCurveTo(x - 7, -24, x + 7, -24, x + 7, -12);
      g.lineTo(x + 6, 31);
      g.lineTo(x - 6, 31);
      g.closePath();
    };
    hull();
    ink(g, lin(g, x - 7, 0, x + 7, 0, [[0, shade(PINE, -0.3)], [0.35, shade(PINE, 0.45)], [0.65, shade(PINE, 0.1)], [1, shade(PINE, -0.35)]]), 1.8);
    g.save();
    hull();
    g.clip();
    g.fillStyle = accent;
    g.fillRect(x - 8, -12, 16, 3.4);
    g.restore();
    g.beginPath();
    g.moveTo(x, -20);
    g.lineTo(x, 29);
    g.lineWidth = 0.8;
    g.strokeStyle = rgba('#7a5a30', 0.45);
    g.stroke();
  }
}

function wings(g, accent) {
  rounded(g, -46, 4, 46, 22, 8); // the wing
  ink(g, lin(g, 0, 4, 0, 22, [[0, '#ffffff'], [0.4, CREAM], [1, shade(CREAM, -0.28)]]), 2.2);
  for (const s of [-1, 1]) {
    rounded(g, s > 0 ? 36 : -46, 4, s > 0 ? 46 : -36, 22, 6); // red tips
    ink(g, lin(g, 0, 4, 0, 22, [[0, shade(accent, 0.3)], [1, shade(accent, -0.3)]]), 1.6);
    g.fillStyle = rgba(accent, 0.9); // a stripe
    g.fillRect(s * 26 - 2, 5, 4, 16);
    g.beginPath(); // the ribs under the paint
    for (const x of [10, 18, 30]) {
      g.moveTo(s * x, 6);
      g.lineTo(s * x, 20);
    }
    g.lineWidth = 0.8;
    g.strokeStyle = rgba('#7a5a30', 0.3);
    g.stroke();
  }
  rounded(g, -19, 30, 19, 40, 4); // the tailplane
  ink(g, lin(g, 0, 30, 0, 40, [[0, '#ffffff'], [1, shade(CREAM, -0.25)]]), 1.8);
  for (const s of [-1, 1]) {
    rounded(g, s > 0 ? 13 : -19, 30, s > 0 ? 19 : -13, 40, 3);
    ink(g, accent, 1.2);
  }
}

function fuselage(g, accent) {
  g.beginPath();
  g.moveTo(-7, -36);
  g.bezierCurveTo(-9, -10, -7, 20, -3, 42);
  g.lineTo(3, 42);
  g.bezierCurveTo(7, 20, 9, -10, 7, -36);
  g.closePath();
  ink(g, lin(g, -8, 0, 8, 0, [[0, shade(PINE, -0.35)], [0.35, shade(PINE, 0.35)], [0.6, PINE], [1, shade(PINE, -0.4)]]), 2.2);
  g.beginPath(); // the grain
  for (const [x, k] of [[-3.5, 0.8], [-1, -0.6], [2, 0.5], [4.2, -0.4]]) {
    g.moveTo(x, -33);
    g.bezierCurveTo(x + k * 2, -10, x - k * 2, 14, x * 0.5, 40);
  }
  g.lineWidth = 0.7;
  g.strokeStyle = rgba('#6a3c14', 0.45);
  g.stroke();
  rounded(g, -1.6, 26, 1.6, 44, 1.5); // the fin, edge on
  ink(g, accent, 1.2);
  g.beginPath(); // the cockpit and its pilot
  g.ellipse(0, -8, 5.4, 7.5, 0, 0, TAU);
  ink(g, '#2a1a10', 1.6);
  g.beginPath();
  g.arc(0, -8, 4.4, 0, TAU);
  ink(g, rad(g, -1.2, -9.4, 0.5, 4.4, [[0, '#ffe8c8'], [1, '#c88a50']]), 1.2);
  g.beginPath();
  g.arc(0, -8, 4.4, Math.PI * 1.05, Math.PI * 1.95);
  g.lineWidth = 2.4;
  g.strokeStyle = '#6a3a1a';
  g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(s * 1.9, -10.6, 1.5, 0, TAU);
    ink(g, '#bfe8ff', 0.9);
  }
  g.beginPath(); // the cowl and the red rubber nose
  g.ellipse(0, -36, 7.6, 3.4, 0, 0, TAU);
  ink(g, mix(PINE, '#3a1e08', 0.45), 1.6);
  g.beginPath();
  g.moveTo(-6.6, -37);
  g.bezierCurveTo(-6.6, -46, 6.6, -46, 6.6, -37);
  g.closePath();
  ink(g, rad(g, -2, -42, 0.5, 9, [[0, shade(accent, 0.65)], [0.45, accent], [1, shade(accent, -0.45)]]), 1.8);
}

export function planeSprite(accent) {
  return cached('toyPlane' + accent, PLANE, PLANE, (g) => {
    g.translate(PLANE / 2, PLANE / 2 + 2);
    floats(g, accent);
    wings(g, accent);
    fuselage(g, accent);
  });
}

// The plane in the ship's frame (centre at the origin), then its propeller turning at t; the wing tips' share of the hull's 38 px.
export function drawToyPlane(ctx, bank, accent, t) {
  ctx.drawImage(planeSprite(accent), -PLANE / 2, -PLANE / 2);
  const [x, y, span] = PROP;
  const reach = span * Math.cos(t * PROP_SPIN);
  ctx.fillStyle = 'rgba(255,248,224,0.32)';
  ctx.beginPath();
  ctx.ellipse(x, y, span, 3.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7a4a1e';
  ctx.fillRect(x - Math.abs(reach), y - 1.6, Math.abs(reach) * 2, 3.2);
  const k = 1 - 0.14 * Math.abs(bank);
  return [k, k];
}
