// The colophon (the user asked for it, 2026-11-18): a printed sheet tacked low on the right of the near layer (parallax-press-floor.js),
// where world 19 has its brass plate, reading COLOPHON in ink on cream paper under a vermilion rule. It sits under the fight and well clear
// of the HUD; the near layer moves at most about 76 px with the ship, so it never leaves the frame.
import { rgba, lin } from './sprites.js';
import { TAU } from '../core/math.js';
import { PAL, COLOPHON } from './press-kit.js';

// Its centre in the frame with the ship at the middle (x, y), its size, the letters' size and face.
export const SHEET = { x: 1536, y: 1026, w: 600, h: 62, size: 22, font: 'Georgia, "DejaVu Serif", "Times New Roman", serif' };
export const ROOM = 48; // px of the sheet's width the letters leave to its margins

// The sheet centred on (cx, cy) of the canvas it is painted on.
export function colophon(g, cx, cy) {
  const { w, h } = SHEET;
  const [x, y] = [cx - w / 2, cy - h / 2];
  g.save();
  g.fillStyle = rgba(PAL.ink, 0.5); // its shadow on the floor
  g.fillRect(x + 3, y + 5, w, h);
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, PAL.paper], [1, PAL.paperShade]]);
  g.fillRect(x, y, w, h);
  g.fillStyle = PAL.vermilion;
  g.fillRect(x + 16, y + 9, w - 32, 3);
  g.fillStyle = PAL.ink; // the tacks
  for (const tx of [x + 8, x + w - 8]) {
    g.beginPath();
    g.arc(tx, y + 8, 3.5, 0, TAU);
    g.fill();
  }
  g.font = `italic ${SHEET.size}px ${SHEET.font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(COLOPHON, cx, cy + 5, w - ROOM);
  g.restore();
}
