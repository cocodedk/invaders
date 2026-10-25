import { level, wave } from './world-kit.js';

// Shared by the mirror tests (world 16's power).
export const lv = (extra = {}) => level([wave({ rows: 1, cols: 3, roles: ['grunt'] })], 0, extra);
// World 16's drop list but not its twist, so the power is tested alone.
export const w16 = () => lv({ world: 16 });
export const fresh = (w) => w.shots.filter((s) => s.life === 1.5); // fired this tick: stepBullet has not aged it
export const twin = (w) => { w.ship.power = { kind: 'mirror', left: 10 }; };
