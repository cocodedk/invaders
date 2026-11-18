// The maker's mark (the user asked for one quieter than world 20's colophon, 2026-11-18): a small palm-leaf page floating low on the
// right of the near layer (parallax-isle-sea.js), where world 20 has its colophon, lettered in an ink only a little darker than the
// leaf. No frame, no rule, no shadow, no glow. The near layer moves at most about 76 px with the ship, so it never leaves the frame.
import { lin } from './sprites.js';
import { PAL, MARK } from './isle-kit.js';

// Its centre in the frame with the ship at the middle (x, y), its size, the letters' size and face.
export const LEAF = { x: 1600, y: 1048, w: 270, h: 28, size: 15, font: 'Georgia, "DejaVu Serif", "Times New Roman", serif' };
export const ROOM = 30; // px of the leaf's width the letters leave to its tapered ends

// The leaf centred on (cx, cy) of the canvas it is painted on: a long narrow page, its ends tapering.
export function mark(g, cx, cy) {
  const { w, h } = LEAF;
  const [x0, x1, y0, y1] = [cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2];
  g.save();
  g.fillStyle = lin(g, 0, y0, 0, y1, [[0, PAL.leaf], [1, PAL.leafShade]]);
  g.beginPath();
  g.moveTo(x0, cy);
  g.quadraticCurveTo(x0 + 6, y0, x0 + h, y0);
  g.lineTo(x1 - h, y0);
  g.quadraticCurveTo(x1 - 6, y0, x1, cy);
  g.quadraticCurveTo(x1 - 6, y1, x1 - h, y1);
  g.lineTo(x0 + h, y1);
  g.quadraticCurveTo(x0 + 6, y1, x0, cy);
  g.fill();
  g.fillStyle = PAL.ink;
  g.font = `${LEAF.size}px ${LEAF.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(MARK, cx, cy + 1, w - ROOM);
  g.restore();
}
