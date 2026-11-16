// The maker's mark (the user asked for it, 2026-11-15): a small engraved brass plate screwed to the tub's flank in the near layer
// (parallax-bath-foam.js), reading MAKER_MARK. It sits low on the right, under the fight (no alien holds below FLOOR) and well clear of
// the HUD; the near layer moves at most about 76 px with the ship, so it never leaves the frame, and nothing but the playfield is drawn
// over that layer. The letters are cut into the brass: a pale lip under each stroke, the stroke itself dark.
import { rgba, lin, roundRect } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL, MAKER_MARK } from './sky-bodies-11-kit.js';

// Its centre in the frame with the ship at the middle (x, y), its size, the letters' size and face.
export const PLATE = { x: 1556, y: 1022, w: 540, h: 46, size: 21, font: 'Georgia, "DejaVu Serif", "Times New Roman", serif' };
export const INK = '#2e1a06'; // the cut
const LIP = '#fff1c2'; // the pale edge under each cut
export const ROOM = 64; // px of the plate's width the letters leave to its screws and its ends

function screw(g, x, y) {
  g.fillStyle = PAL.brass.dark;
  g.beginPath();
  g.arc(x, y, 5.5, 0, TAU);
  g.fill();
  g.fillStyle = PAL.brass.light;
  g.beginPath();
  g.arc(x - 0.6, y - 0.6, 4.2, 0, TAU);
  g.fill();
  g.strokeStyle = PAL.brass.dark;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x - 3, y + 2);
  g.lineTo(x + 3, y - 2);
  g.stroke();
}

// The plate centred on (cx, cy) of the canvas it is painted on.
export function makerPlate(g, cx, cy) {
  const { w, h } = PLATE;
  const [x, y] = [cx - w / 2, cy - h / 2];
  g.save();
  g.fillStyle = rgba('#3a2a10', 0.32); // its shadow on the enamel
  roundRect(g, x + 2, y + 4, w, h, 8);
  g.fill();
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#f6d88a'], [0.45, '#d6a443'], [1, '#9a6c1e']]);
  roundRect(g, x, y, w, h, 8);
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = PAL.brass.dark;
  g.stroke();
  g.strokeStyle = rgba(LIP, 0.75); // the bevel
  g.lineWidth = 1.5;
  roundRect(g, x + 5, y + 5, w - 10, h - 10, 5);
  g.stroke();
  screw(g, x + 17, cy);
  screw(g, x + w - 17, cy);
  g.font = `700 ${PLATE.size}px ${PLATE.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = LIP;
  g.fillText(MAKER_MARK, cx, cy + 1.5, w - ROOM);
  g.fillStyle = INK;
  g.fillText(MAKER_MARK, cx, cy, w - ROOM);
  g.restore();
}
