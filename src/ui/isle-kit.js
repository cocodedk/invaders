// What World 21's backdrop shares (sky-bodies-13.js, parallax-isle*.js, ambient-13.js, looks/w21.js): the maker's mark's text, the
// isle's colours (gold leaf, crimson dusk, a warm violet sea, blank grey stones, brass and marigold) and where the low sun and the
// island's three peaks stand, so the sky and the far layer agree. The brightest gold is kept low, under the alien rows (the renderer
// lights with 'lighter'); above them the dusk stays mid-dark.
import { HEIGHT } from '../core/kinds.js';

export const MARK = 'cocode.dk · graph-loop · 2026'; // the palm-leaf page on the near layer's water (parallax-isle-mark.js)
export const ISLE_WORLD = 21; // the renderer picks the chariot (ship-isle.js), its arrows (shots-isle.js) and the pickup rim (pickup-isle.js) by it
export const MARGIN = 160; // parallax.js's margin, each side of a layer (not imported: parallax.js imports the painters)

export const PAL = {
  gold: '#f2c14e', goldDeep: '#a8751f', goldPale: '#ffe6a6', crimson: '#c4303a', ember: '#ff7a2a', flame: '#ffb347',
  cloud: '#170c1c', cloudLow: '#2c1020', sea: '#1a1a34', seaLit: '#7a3a34', stone: '#3c3644', stoneLit: '#a08460',
  smoke: '#22161e', smokeLit: '#5a3a38', brass: '#d0a048', marigold: '#ffa51f', marigoldDeep: '#e8620c', leaf: '#8c7c5a', leafShade: '#7c6c4e', ink: '#4c3e26',
};

export const SUN = { x: 1400, y: 700, r: 96 }; // the great low sun, in the frame: its disc under the alien rows, sinking into the sea (mid layer)
export const SEA_TOP = 30; // the sea's horizon in the mid layer, from its top
export const MID_HEIGHT = 340; // the mid layer's height (looks/w21.js, islecauseway)
export const ISLE = {
  sea: HEIGHT - MID_HEIGHT + SEA_TOP, // the frame y of the island's waterline: the mid layer's horizon
  peaks: [[470, 300], [720, 368], [975, 318]], spread: 420, // the mountain's three peaks: frame x, height over the waterline
  seed: 2122, // the city's own layout, the same on every level of the world
  tiers: [754, 702, 650, 600, 552], tall: [92, 78, 66, 56, 48], // the walled terraces, frame y, near to far, and the height of a building on each
  fires: [[455, 2], [700, 3], [1010, 1]], // the burning roofs: frame x and terrace; smoke rises over each (fireAt, the sky)
};
// Where the smoke of a burning roof starts, in the frame: over the burning hall's eaves (parallax-isle-city.js).
export const fireAt = ([x, t]) => [x, ISLE.tiers[t] - ISLE.tall[t] * 0.62];
// Where the sky's cast is painted (the owner's, 2026-11-19): each figure's box, top left, in the frame, and on the boss level the
// champion's box and scale, low on the right out of the king's reach (finale). The near shore's cast stands where parallax-isle-shore.js
// SHORE says.
export const CAST = { vulture: [140, 130], champion: [1450, 250], finale: [1700, 558, 0.44] };
