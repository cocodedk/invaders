// Difficulty belongs to the level, not to progress: world 8 is hard even when played first.
// Exports: difficulty(world, index) -> d in [0, 1]; scaled(d) -> the rules at d; FIRE_UP.

// 0 at world 1 level 1, 1 at world 8 level 5, in 39 equal steps.
export const difficulty = (world, index) => ((world - 1) * 5 + index - 1) / 39;

// R54: the enemy shoots this many times more than the d curve alone says, to pay for the extra
// power-up drops (KILL_DROP in powerups.js) and keep the game no easier. 1.5 is the value that held
// the clear rate and hits a run at their old levels in the headless balance run, next to a KILL_DROP
// of 3 % (see the spec, R54). It scales the boss's attacks and its gunner minions too (fireMult).
export const FIRE_UP = 1.5;

// What d does to the rules. fireMult multiplies ROLES[role].fire; formationSpeed multiplies a
// wave's own speed; armorBonus is extra hp for armored and gunner aliens.
export const scaled = (d) => ({
  bulletSpeed: 260 + 260 * d,
  fireMult: (0.6 + 1.0 * d) * FIRE_UP,
  formationSpeed: 1 + 0.6 * d,
  armorBonus: d > 0.6 ? 1 : 0,
});
