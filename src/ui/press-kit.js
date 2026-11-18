// What World 20's backdrop shares (sky-bodies-12.js, parallax-press*.js, ambient-12.js, looks/w20.js): the colophon's text, the hall's
// colours (cream paper, ink black and one vermilion spot colour, with the iron of the presses and the lamps' and the moon's light) and
// where the back wall's trusses, windows, drying line and lamps are. The wall stays dark where the fight is (the renderer lights with
// 'lighter'): the paper above the alien rows is laid thin.
export const COLOPHON = 'built by graph skill fable-5.2 2026-11-18. cocode.dk'; // the printed sheet in the near layer (parallax-press-colophon.js)
export const PRESS_WORLD = 20; // the renderer picks the dart (ship-press.js), its ink strokes (shots-press.js) and the pickup rim (pickup-press.js) by it
export const CARBON = '#3a62d8'; // the carbon copy's blue (the echo, core/echo.js): its tracing and its shots
export const CARBON_PALE = '#a8c0ff'; // the glint along a carbon shot
export const MARGIN = 160; // parallax.js's margin, each side of a layer (not imported: parallax.js imports the painters)

export const PAL = {
  paper: '#efe4c8', paperShade: '#c8b994', ink: '#0d0b10', vermilion: '#e2401c',
  iron: '#24222b', ironLit: '#4a4552', glass: '#1c2434', glassLow: '#11151f', moon: '#a8b8d8', lamp: '#ffd27a', wood: '#2a1d16',
};

export const HALL = {
  truss: 118, bay: 240, // the roof's bottom chord, under the HUD's band, and the width of a bay of its lattice
  windows: [480, 960, 1440], window: { y: 170, w: 170, h: 380 }, pane: 64, // the three tall arched windows: their centres, size and glazing
  line: { y: 150, span: 480, sag: 26, sheet: 64, a: 0.16 }, // the far drying line: height, span between hooks, sag, sheet pitch, alpha
  lamps: [[240, 330], [720, 290], [1200, 330], [1680, 290]], lamp: { r: 230, a: 0.2 }, // the hanging lamps and their pools of light
};
