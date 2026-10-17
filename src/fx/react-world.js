// Reactions to pickups and to each world's twist: lightning, glitches, sand, acid, wrecks, the well.
import { addShake } from './camera.js';
import { addFlash, addPopup, addRing, addSlice } from './fx.js';
import { addParticle } from './particles.js';
import { between } from '../core/rng.js';
import { count, debris, dust, FIRE, METAL, smoke, sparks } from './emit.js';

const POWER_COLORS = { spread: '#ffd24a', laser: '#ff4fd8', rapid: '#6ad6ff', shield: '#5cf0ff', bomb: '#ff8a3a' };
const GLYPH = ['#5dff9a', '#b8ffd0', '#ffffff'];
const RED_EYE = ['#ff3a2a', '#ff7a3a', '#ffd0a0'];
const clampX = (x) => Math.min(1890, Math.max(30, x));

function pickup(fx, ev, rng) {
  const color = POWER_COLORS[ev.kind] ?? '#ffffff';
  addRing(fx, { x: ev.x, y: ev.y, maxR: 90, color, life: 0.4 });
  sparks(fx, rng, ev.x, ev.y, 8, 260, [color, '#ffffff']);
  const text = ev.kind === 'bomb' ? '+1 BOMB' : String(ev.kind).toUpperCase();
  addPopup(fx, { x: ev.x, y: ev.y - 24, text, color, scale: 1.3, life: 1.2 });
}

// A power-up starting rings out from the ship; one running out fizzles into smoke.
function power(fx, ev, rng, world) {
  const ship = world?.ship;
  if (!ship) return;
  if (ev.on) addRing(fx, { x: ship.x, y: ship.y, maxR: 140, color: POWER_COLORS[ev.kind] ?? '#ffffff', life: 0.5 });
  else smoke(fx, rng, ship.x, ship.y, 3, 14, 10);
}

function lightning(fx, ev) {
  const strength = ev.strength ?? 1;
  addFlash(fx, { full: true, color: '#dfe8ff', alpha: 0.35 + 0.55 * strength, life: 0.22, tag: 'lightning' });
  addShake(fx, 3 * strength);
}

// A slot-to-slot blink: shifted bands of the frame and a green flash at both ends.
function teleport(fx, ev, rng) {
  for (const [x, y] of [[ev.fromX, ev.fromY], [ev.x, ev.y]]) {
    for (let i = 0; i < 3; i++) {
      addSlice(fx, {
        x: x - 50, y: y + between(rng, -30, 30), w: between(rng, 60, 110), h: between(rng, 4, 9),
        dx: (rng() < 0.5 ? -1 : 1) * between(rng, 10, 30), life: 0.2,
      });
    }
    addFlash(fx, { x, y, r: 46, color: '#5dff9a', life: 0.15, tag: 'glitch' });
    sparks(fx, rng, x, y, 3, 200, GLYPH);
  }
}

function absorb(fx, ev) {
  addRing(fx, { x: ev.x, y: ev.y, r0: 70, maxR: 6, width: 3, color: '#b08cff', kind: 'lens', life: 0.3 });
  addFlash(fx, { x: ev.x, y: ev.y, r: 40, color: '#b08cff', life: 0.12, tag: 'lens' });
}

function saucer(fx, ev) {
  const x = clampX(ev.x);
  addFlash(fx, { x, y: ev.y, r: 110, color: '#ff4f6a', life: 0.3, tag: 'saucer' });
  addRing(fx, { x, y: ev.y, maxR: 90, color: '#ff4f6a', life: 0.4 });
}

// Sand streaks that cross the frame the way the wind blows.
function gust(fx, ev, rng) {
  const dir = Math.sign(ev.wind);
  if (!dir) return;
  for (let i = 0, m = count(fx, 10); i < m; i++) {
    addParticle(fx, {
      x: dir > 0 ? -20 : 1940, y: between(rng, 0, 1080), vx: dir * between(rng, 900, 1500),
      vy: between(rng, -30, 60), life: 1.6, size: between(rng, 1.5, 2.5), color: '#e0c48a', kind: 'dust',
    });
  }
}

function acid(fx, ev, rng) {
  for (let i = 0, m = count(fx, 4); i < m; i++) {
    addParticle(fx, {
      x: ev.x + between(rng, -6, 6), y: ev.y, vx: between(rng, -50, 50), vy: between(rng, -120, -40),
      life: between(rng, 0.4, 0.8), size: between(rng, 2.5, 4), color: '#a6ff3a', kind: 'acid',
      gravity: 600, drag: 0.3,
    });
  }
  addFlash(fx, { x: ev.x, y: ev.y, r: 34, color: '#a6ff3a', life: 0.1, tag: 'acid' });
}

function wreck(fx, ev, rng) {
  smoke(fx, rng, ev.x, ev.y, 3, 12, 9);
  sparks(fx, rng, ev.x, ev.y, 4, 200, RED_EYE);
  for (let i = 0, m = count(fx, 3); i < m; i++) {
    addParticle(fx, {
      x: ev.x + between(rng, -10, 10), y: ev.y, vx: between(rng, -15, 15), vy: between(rng, -60, -20),
      life: between(rng, 1, 1.6), size: 2.5, grow: -1, color: '#ffb14a', kind: 'ember', additive: true, drag: 0.8,
    });
  }
}

function wreckDown(fx, ev, rng) {
  addFlash(fx, { x: ev.x, y: ev.y, r: 120, life: 0.15, tag: 'blast' });
  addRing(fx, { x: ev.x, y: ev.y, maxR: 140, life: 0.4, color: '#ffe9b0' });
  sparks(fx, rng, ev.x, ev.y, 14, 320, RED_EYE);
  debris(fx, rng, ev.x, ev.y, 8, METAL, 240);
}

// The pieces draw back together: sparks fly in from around the spot and arrive as the ring closes.
function reassemble(fx, ev, rng) {
  const life = 0.4;
  for (let i = 0, m = count(fx, 10); i < m; i++) {
    const a = rng() * Math.PI * 2;
    const r = between(rng, 40, 80);
    addParticle(fx, {
      x: ev.x + Math.cos(a) * r, y: ev.y + Math.sin(a) * r, vx: -Math.cos(a) * r / life,
      vy: -Math.sin(a) * r / life, life, size: 3, color: RED_EYE[i % RED_EYE.length], additive: true,
    });
  }
  addRing(fx, { x: ev.x, y: ev.y, r0: 90, maxR: 8, width: 3, color: '#ff5a3a', kind: 'lens', life });
}

function bulletTime(fx, ev) {
  fx.bulletTime = !!ev.on;
  addFlash(fx, { full: true, color: '#3affc8', alpha: ev.on ? 0.3 : 0.15, life: 0.3, tag: 'bullettime' });
}

function cut(fx, ev, rng) {
  addFlash(fx, { x: ev.x, y: ev.y, r: 44, alpha: 0.9, life: 0.08, tag: 'cut' });
  addRing(fx, { x: ev.x, y: ev.y, r0: 4, maxR: 50, width: 2, life: 0.2 });
  sparks(fx, rng, ev.x, ev.y, 8, 420, ['#ffffff', '#bff4ff']);
}

function bunker(fx, ev, rng) {
  if (ev.laser) sparks(fx, rng, ev.x, ev.y, 4, 220, FIRE);
  else dust(fx, rng, ev.x, ev.y, 4, '#7a8a7a');
}

export const WORLD = {
  pickup, power, lightning, teleport, absorb, saucer, gust, acid, wreck, wreckDown, reassemble,
  bulletTime, cut, bunker,
};
