// Every sound patch by name (audio.js play(name)): the fight, power-ups and the bomb, the bosses and
// big blasts, the world twists, Sunset Armada's two rules, Ember Carnival's burst, Lantern Deep's pearls and
// trident, the stingers and menus, and the trailer's film sounds.
import { FIGHT } from './sfx-fight.js';
import { POWER } from './sfx-power.js';
import { BOSS } from './sfx-boss.js';
import { WORLD } from './sfx-world.js';
import { ARMADA } from './sfx-armada.js';
import { CARNIVAL } from './sfx-carnival.js';
import { DEEP } from './sfx-deep.js';
import { UI } from './sfx-ui.js';
import { FILM } from './sfx-film.js';

export const SFX = { ...FIGHT, ...POWER, ...BOSS, ...WORLD, ...ARMADA, ...CARNIVAL, ...DEEP, ...UI, ...FILM };
