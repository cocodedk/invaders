// What the capsule rims share (pickup-skins.js FRAMES, and the rims in the files of their own, pickup-wander.js): the dark middle, a ring
// stroked round the origin, and a regular polygon. Baked with the rim (pickups-view.js), so nothing here runs per frame.
import { TAU } from '../core/math.js';

export const disc = (g, r) => {
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
};
export const ring = (g, r, color, w) => {
  g.lineWidth = w;
  g.strokeStyle = color;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.stroke();
};
export const poly = (g, n, r, rot = 0) => {
  g.beginPath();
  for (let i = 0; i < n; i++) g.lineTo(Math.cos(rot + (i * TAU) / n) * r, Math.sin(rot + (i * TAU) / n) * r);
  g.closePath();
};
