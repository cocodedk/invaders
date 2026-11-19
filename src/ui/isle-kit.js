// What World 21's backdrop shares (sky-bodies-13.js, parallax-isle*.js, ambient-13.js, looks/w21.js): the maker's mark's text, the
// isle's colours (gold leaf, crimson dusk, a warm violet sea, blank grey stones, brass and marigold) and where the low sun and the
// island's three peaks stand, so the sky and the far layer agree. The brightest gold is kept low, under the alien rows (the renderer
// lights with 'lighter'); above them the dusk stays mid-dark.
export const MARK = 'cocode.dk · graph-loop · 2026'; // the palm-leaf page on the near layer's water (parallax-isle-mark.js)
export const ISLE_WORLD = 21; // the renderer picks the chariot (ship-isle.js), its arrows (shots-isle.js) and the pickup rim (pickup-isle.js) by it
export const MARGIN = 160; // parallax.js's margin, each side of a layer (not imported: parallax.js imports the painters)

export const PAL = {
  gold: '#f2c14e', goldDeep: '#a8751f', goldPale: '#ffe6a6', crimson: '#c4303a', ember: '#ff7a2a', flame: '#ffb347',
  cloud: '#170c1c', cloudLow: '#2c1020', sea: '#1a1a34', seaLit: '#7a3a34', stone: '#3c3644', stoneLit: '#a08460',
  smoke: '#22161e', smokeLit: '#5a3a38', brass: '#d0a048', marigold: '#ffa51f', marigoldDeep: '#e8620c', leaf: '#8c7c5a', leafShade: '#7c6c4e', ink: '#4c3e26',
};

export const SUN = { x: 1400, y: 700, r: 96 }; // the great low sun, in the frame: its disc under the alien rows, sinking into the sea (mid layer)
export const ISLE = {
  peaks: [[620, 580], [870, 650], [1120, 560]], spread: 400, // the mountain's three peaks: far-layer x and height over its foot
  tiers: [300, 360, 420], // the gilded walls' tops, far-layer y, one tier above the next
  fires: [470, 700, 1010], // frame x of the burning quarters: a tower there burns (the far layer) and smoke rises over it (the sky)
  fireY: 560, // frame y the smoke rises from, behind the towers
};
export const SEA_TOP = 30; // the sea's horizon in the mid layer (340 tall: frame 770)
