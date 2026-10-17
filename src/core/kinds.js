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
export const POWERS = ['spread', 'laser', 'rapid', 'shield'];

// World order: WORLDS[i].twist is TWISTS[i] and WORLDS[i].boss is BOSSES[i].
export const TWISTS = ['bunkers', 'darkness', 'gusts', 'shuriken', 'acid', 'glitch', 'reassemble', 'gravity'];
export const BOSSES = ['mothership', 'pyramid', 'fortress', 'shogun', 'queen', 'agent', 'titan', 'singularity'];

// Collision sizes shared by the collision code and by everything that must agree with it.
export const ALIEN_R = 26; // hit radius of an alien
export const NEAR_MISS = 28; // centre distance, for a standard 8 px bullet: 6 px outside the hit circle

// The fixed step of the simulation, in seconds: every stepWorld call in a game, a replay or a test.
export const TICK = 1 / 60;
