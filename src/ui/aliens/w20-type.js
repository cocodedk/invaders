// World 20, Midnight Press, the grunt and the diver (see w20.js). THE LOWERCASE, a fat lowercase e cut from paper and inked at the rim,
// its eyes in its counter, walking on little ink legs that swing on each beat; and THE INK DROP, a tear of vermilion ink diving face
// first at the ship, a splash of ink thrown up behind it and spatter trailing, stretched on beat 0 and squashed on beat 1.
// Lights: the lamp's catch on wet ink and the vermilion spot glowing.
import { path, ink, rgba, shade, mix, line, ellipse, circle, both, TAU, INKY, PAPER, inked, paperEye, blot, wet, spot, legs, serif } from './w20-kit.js';

// The Lowercase: a ring of paper with a crossbar and an open lower right, the counter dark where the eyes sit.
export function grunt(b, l, f, c) {
  const [cx, cy, r, t] = [0, -4, 30, 12]; // the letter's centre, outer radius and stroke
  legs(b, cx, cy + r - 6, 36, 4, 16, f);
  ellipse(b, cx + 2, cy + r + 12, r * 0.9, 4); // its shadow on the sheet
  b.fillStyle = rgba(INKY, 0.35);
  b.fill();
  b.beginPath(); // the bowl of the e: an arc from the crossbar round to the open terminal
  b.arc(cx, cy, r, 0.45, TAU);
  b.arc(cx, cy, r - t, TAU, 0.45, true);
  b.closePath();
  ink(b, inked(b, c, -r, cy - r, r, cy + r), 3);
  b.save();
  b.beginPath();
  b.arc(cx, cy, r - t, 0, TAU);
  b.clip();
  b.fillStyle = mix(INKY, c, 0.15); // the counter, ink-dark
  b.fillRect(cx - r, cy - r, r * 2, r * 2);
  for (let i = 0; i < 9; i++) { // the grain of the paper showing through the ink
    circle(b, cx - 14 + (i % 3) * 14, cy - 14 + Math.floor(i / 3) * 8, 1.2);
    b.fillStyle = rgba(PAPER, 0.12);
    b.fill();
  }
  b.restore();
  path(b, [[cx - r + t - 1, cy - 3], [cx + r, cy - 3], [cx + r, cy + 4], [cx - r + t - 1, cy + 4]]); // the crossbar
  ink(b, inked(b, c, -r, cy - 4, r, cy + 4), 2.4);
  for (let i = 0; i < 14; i++) { // fibres in the paper
    const a = 0.6 + (i / 14) * 5.4;
    b.beginPath();
    b.arc(cx, cy, r - t / 2 + ((i % 3) - 1) * 3, a, a + 0.18);
    line(b, rgba(mix(c, INKY, 0.4), 0.35), 1);
  }
  both((s) => paperEye(b, l, cx + s * 7, cy - 10, 4.6, s * 0.2, 0.4));
  b.beginPath(); // a grin under the crossbar
  b.arc(cx + 3, cy + 9, 7, 0.3, Math.PI - 0.3);
  line(b, INKY, 2.2);
  serif(b, cx + r - 2, cy + 24, 12);
  b.beginPath();
  b.arc(cx, cy, r - 2, Math.PI * 1.1, Math.PI * 1.45);
  line(b, rgba('#ffffff', 0.5), 2);
  wet(l, cx - 16, cy - 18, 7, 4, -0.6);
  wet(l, cx + 12, cy + 20, 4, 2.4, 0.4, 0.3);
  spot(l, cx + r - 2, cy - 3, 2.6, 0.35 + f * 0.1);
}

// The Ink Drop: a tear of ink pointing down, the fat end leading, a crown of splash above it.
function drop(g, w, h, cy) {
  g.beginPath();
  g.moveTo(0, cy - h * 0.6);
  g.bezierCurveTo(w * 0.15, cy - h * 0.3, w * 0.5, cy, w * 0.5, cy + h * 0.15);
  g.bezierCurveTo(w * 0.5, cy + h * 0.45, w * 0.25, cy + h * 0.5, 0, cy + h * 0.5);
  g.bezierCurveTo(-w * 0.25, cy + h * 0.5, -w * 0.5, cy + h * 0.45, -w * 0.5, cy + h * 0.15);
  g.bezierCurveTo(-w * 0.5, cy, -w * 0.15, cy - h * 0.3, 0, cy - h * 0.6);
  g.closePath();
}

export function diver(b, l, f, c) {
  const [w, h, cy] = f ? [50, 62, 6] : [40, 76, 4];
  for (let i = 0; i < 6; i++) blot(b, (i - 2.5) * 9 + (f ? 3 : -3), -38 + (i % 2) * 6, 2 + (i % 3), i + f * 7, rgba(INKY, 0.7));
  for (const s of [-1, 1]) { // the splash thrown up behind it
    path(b, [[s * 6, cy - h * 0.45], [s * 18, cy - h * 0.62], [s * 12, cy - h * 0.38]]);
    ink(b, mix(c, INKY, 0.3), 1.6);
  }
  drop(b, w, h, cy);
  ink(b, inked(b, c, -w / 2, cy - h / 2, w / 2, cy + h / 2), 3);
  b.save();
  drop(b, w, h, cy);
  b.clip();
  ellipse(b, w * 0.18, cy + h * 0.3, w * 0.4, h * 0.25); // the shade where the ink pools
  b.fillStyle = rgba(INKY, 0.3);
  b.fill();
  for (let i = 0; i < 7; i++) { // swirls in the wet ink
    b.beginPath();
    b.arc(-w * 0.1 + i * 2, cy + i * 3 - 6, 6 + i * 2, 3.6, 4.6);
    line(b, rgba(shade(c, 0.5), 0.3), 1.1);
  }
  b.restore();
  both((s) => paperEye(b, l, s * w * 0.18, cy + h * 0.12, 6, 0, 0.6));
  b.beginPath(); // a gaping mouth at the leading end
  b.ellipse(0, cy + h * 0.34, 6, 4 + f * 1.5, 0, 0, TAU);
  ink(b, INKY, 1.4);
  path(b, [[-w * 0.38, cy - 2], [-w * 0.1, cy + h * 0.02]], true); // furious brows
  line(b, INKY, 2.4);
  path(b, [[w * 0.38, cy - 2], [w * 0.1, cy + h * 0.02]], true);
  line(b, INKY, 2.4);
  wet(l, -w * 0.2, cy - h * 0.1, 5, 9, 0.3, 0.5);
  wet(l, w * 0.22, cy + h * 0.3, 3, 2, 0, 0.3);
  spot(l, 0, cy + h * 0.15, 3.4, 0.45);
  spot(l, 0, cy - h * 0.55, 1.6, 0.3);
  circle(l, 0, cy - h * 0.6, 1.4);
  l.fillStyle = rgba(PAPER, 0.8);
  l.fill();
}
