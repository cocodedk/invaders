import { STRIKE_AT } from '../../src/core/bonk.js';

// Shared by test/fx/react-bath*.test.js: world 19 as the reaction sees it, and the events it is shown.
export const bath = { level: { world: 19, twist: 'bonk' }, ship: { x: 800, y: 900 }, aliens: [] };
export const EVENTS = ['whack', 'bonk', 'bank', 'strike', 'plop', 'fizzle'];
export const at = (type, more = {}) => ({ type, id: 4, role: 'grunt', x: 640, y: 300, link: 0, ko: true, dx: 0.6, dy: -0.8, links: STRIKE_AT, ...more });
export const kill = { type: 'kill', role: 'diver', x: 700, y: 320, score: 150, mult: 1, scored: true };
export const blast = (size) => ({ type: 'explode', x: 700, y: 320, size });
