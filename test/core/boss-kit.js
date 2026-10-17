import { createWorld, stepWorld } from '../../src/core/world.js';
import { levelById } from '../../src/core/levels.js';
import { BOSSES } from '../../src/core/kinds.js';
import { level, playing, input, step, TICK } from './world-kit.js';

// Shared by the boss tests: a boss level, a quiet world past the boss's entrance, a shot dropped
// just under a part, and the simple bot that every boss has to lose to.
export const bossLevel = (kind, d = 0, extra = {}) => level(undefined, d, { boss: kind, ...extra });
// A quiet world with the boss in place and its entrance over.
export function bossWorld(kind, opts) {
  const world = playing(bossLevel(kind), opts);
  while (world.boss.enter > 0) step(world);
  world.events.length = 0;
  return world;
}
export const part = (world, id) => world.boss.parts.find((p) => p.id === id);
export const realLevel = (kind) => levelById(`w${BOSSES.indexOf(kind) + 1}-5`);

// A ship shot 8 px under the part's lower edge, flying straight up.
export const shotOn = (world, p) =>
  world.shots.push({ pattern: 'shot', x: p.x, y: p.y + p.h / 2 + 8, vx: 0, vy: -1400, r: 5, life: 1, dmg: 1 });

// Kill every part but the named ones, which are left with `hp`.
export function leave(world, ids, hp = 1) {
  for (const p of world.boss.parts) p.hp = ids.includes(p.id) ? hp : 0;
}

const TRAVEL = 30; // ticks a shot takes to climb from the ship to the boss

// Stand under the nearest weak part (any plate once none is weak), aimed where it will be, and
// hold fire with an invulnerable ship. Returns the world and every event, until cleared or `limit` s.
export function botFight(kind, limit = 120) {
  const world = createWorld(realLevel(kind));
  world.ship.invuln = Infinity;
  const prev = {};
  const log = [];
  while (world.state !== 'cleared' && world.state !== 'failed' && world.t < limit) {
    const live = world.boss.parts.filter((p) => p.hp > 0 && (p.weak || p.armor));
    const weak = live.filter((p) => p.weak);
    const pool = weak.length ? weak : live;
    let aim = world.ship.x;
    if (pool.length) {
      const near = pool.reduce((a, b) => (Math.abs(b.x - aim) < Math.abs(a.x - aim) ? b : a));
      aim = near.x + (near.x - (prev[near.id] ?? near.x)) * TRAVEL;
    }
    for (const p of world.boss.parts) prev[p.id] = p.x;
    stepWorld(world, TICK, input({ fire: true, target: { x: aim, y: 1000 } }));
    log.push(...world.events.splice(0));
  }
  return { world, log };
}
