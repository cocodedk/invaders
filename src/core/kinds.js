// The shared vocabulary: every name a level, a formation, a pattern or a world may use.

// fire = shots per second at difficulty 0.
export const ROLES = {
  grunt: { hp: 1, score: 100, fire: 0.08 },
  diver: { hp: 1, score: 150, fire: 0.05 },
  gunner: { hp: 2, score: 200, fire: 0.35 },
  armored: { hp: 3, score: 300, fire: 0.1 },
  carrier: { hp: 1, score: 250, fire: 0 },
};

export const FORMATIONS = ['grid', 'sway', 'dive', 'spiral', 'split', 'escort', 'rain', 'orbit'];
export const PATTERNS = ['aimed', 'fan', 'ring', 'spiral', 'laser', 'rain', 'homing', 'shuriken'];
export const POWERS = ['spread', 'laser', 'rapid', 'shield', 'homing', 'slow'];
// World 13 alone also drops 'wingmen' (R61: two escorts that fire with the ship), and world 15 alone
// 'pearls' and 'trident' (R63: a ring of pearls round the ship, and a shot that runs through everything).
// POWERS stays the six, so the drop list and the rng draw of every other world are what they always
// were; powersFor picks the list a level's drops come from.
export const WINGMEN = 'wingmen';
export const PEARLS = 'pearls';
export const TRIDENT = 'trident';
export const POWERS_13 = [...POWERS, WINGMEN];
export const POWERS_15 = [...POWERS, PEARLS, TRIDENT];
const DROPS = { 13: POWERS_13, 15: POWERS_15 };
export const powersFor = (level) => DROPS[level.world] ?? POWERS;

// World order: WORLDS[i].twist is TWISTS[i] and WORLDS[i].boss is BOSSES[i].
// World 9 reuses Twin Suns' storm wind, so its twist repeats world 3's; world 10 reuses Neon Rain's
// darkness, so its twist repeats world 2's; world 11 reuses Ronin Moon's shuriken, drawn there as
// ice shards, so its twist repeats world 4's; world 12 reuses Code Rain's glitch, drawn there as
// pages and gold dust, so its twist repeats world 6's. World 13's broadside is a twist of its own
// (R61): any pickup caught opens the ship's side guns for a while (powerups.js). World 14's fireworks
// is one too (R62): some aliens are shells that burst when they die (fireworks.js). World 15 reuses
// world 8's gravity well, drawn there as a maelstrom, so its twist repeats world 8's.
export const TWISTS = ['bunkers', 'darkness', 'gusts', 'shuriken', 'acid', 'glitch', 'reassemble', 'gravity', 'gusts', 'darkness', 'shuriken', 'glitch', 'broadside', 'fireworks', 'gravity'];
export const BOSSES = ['mothership', 'pyramid', 'fortress', 'shogun', 'queen', 'agent', 'titan', 'singularity', 'behemoth', 'count', 'wyrm', 'grimoire', 'galleon', 'carousel', 'angler'];

// The playfield: a fixed 1920x1080 frame, y down. Its top is the HUD band, whose panels end at
// HUD_BOTTOM; nothing that must be seen or shot may sit behind them.
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const HUD_BOTTOM = 96;
export const MID_X = WIDTH / 2;
export const MID_Y = HEIGHT / 2;
export const EDGE = 20; // px: the closest an alien flies to either side

// The gravity world's well (a template: a world takes a copy, so it stays plain cloneable data).
export const WELL = { x: MID_X, y: 300 };

// Collision sizes shared by the collision code and by everything that must agree with it.
export const ALIEN_R = 26; // hit radius of an alien
export const NEAR_MISS = 28; // centre distance, for a standard 8 px bullet: 6 px outside the hit circle

// The fixed step of the simulation, in seconds: every stepWorld call in a game, a replay or a test.
export const TICK = 1 / 60;
