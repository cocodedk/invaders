// World 19's effects (Rubber Regatta), told as a bath: a knock-out is a puff with little stars and its score, a shot toy that goes
// is a puff of foam, and the batting game (core/bonk.js, the twist 'bonk') has six events of its own. Every one is made of the same
// few things: opaque puffs and little stars (the one new particle kind, 'suds', drawn with an ink rim by ui/bath-fx-view.js) and
// inked pop-ups, so they read on the green tiled wall and on the pale waterline alike. No ring, no flash and no spark here (those
// draw additive light, which a pale field swallows), bar the one flash the backdrop reads: a 'strike' leaves a flash tagged 'strike'
// that lives STRIKE_LIFE seconds, and the two brass taps in the backdrop spurt while it does.
//   kill     (wrapped)  the knock-out: puffs in the toy's own colour, three little stars and the score; any other world: the usual
//   explode  (wrapped)  size 1 (an alien or a part): a puff of foam and a light shake, no fire, no smoke; sizes 2 and 3 and every
//                       other world: the usual
//   whack    { id, role, x, y, dx, dy }        a streak of puffs trailing the launch, along (dx, dy)
//   bonk     { id, role, x, y, link, ko, part? }  a starburst, and BONK, DOUBLE BONK or TRIPLE BONK in a size that grows with the link
//                                              (TOK, small, on a stopper: ko false, a survivor or a boss part)
//   bank     { x, y }                          BOING, and puffs sprung off the wall
//   strike   { x, y, links }                   STRIKE!, a burst of stars, a small shake and the tagged flash
//   plop     { x, role }                       a splash of droplets at the waterline
//   fizzle   { id, role, x, y }                PFFT, and a few puffs going flat
// Each particle recipe goes through emit.js's count(), so the quality scaler thins them all, and no event makes more than EVENT_MAX.
// Pure: randomness comes from `rng`, nothing is drawn, `world` is only read (to ask which world it is).
import { addFlash, addPopup } from './fx.js';
import { addParticle } from './particles.js';
import { addShake } from './camera.js';
import { count } from './emit.js';
import { DEEP } from './react-deep.js';
import { FIGHT, scorePopup, blastSize } from './react-fight.js';
import { STRIKE_AT } from '../core/bonk.js';
import { between, pick } from '../core/rng.js';
import { WIDTH, HEIGHT, MID_X } from '../core/kinds.js';
import { TAU, clamp } from '../core/math.js';

export const BATH_WORLD = 19;
export const EVENT_MAX = 10; // particles one event may make (before the quality scaler thins them)
export const STRIKE_LIFE = 0.9; // s the strike's tagged flash lives
export const POP_BASE = 0.9; // a pop-up's scale at link 0 (BONK, and TOK)
export const POP_TOP = 1.7; // and at STRIKE_AT links: the pop-ups grow until the chain is a strike
export const STRIKE_SCALE = 2.2; // STRIKE! is bigger than any BONK
export const SHAKE = 1.5; // px: a foam puff's light shake (the usual alien blast is 3)
export const STRIKE_SHAKE = 5; // px
export const WATERLINE = HEIGHT - 40; // y a splash starts at: the pale foam at the foot of the field
// Particles each event makes, before the quality scaler thins them (none passes EVENT_MAX).
export const COUNTS = {
  knock: 4, knockCarrier: 6, knockStars: 3, // a knock-out: puffs in the toy's colour (more from a carrier) and little stars
  foam: 5, trail: 5, // an explode of size 1; a whack's streak
  starsKo: 5, starsKoMax: 9, starsTok: 3, // a bonk's stars: a knock-out starts at starsKo and gains one a link up to starsKoMax; a stopper gets starsTok
  bank: 3, strike: 8, plop: 8, fizzle: 4,
};
// Pop-ups: dy is px below (+) or above (-) the spot, life is s, vy px/s; edge keeps the word that many px in from the sides.
export const POP = {
  bonk: { dy: 52, life: 0.9, vy: -30 },
  bank: { dy: -40, life: 0.8, vy: -50, scale: 1.2, edge: 110 },
  strike: { dy: -96, life: 1.3, vy: -40, edge: 150 },
  fizzle: { dy: -30, life: 0.8, vy: -40, scale: 1 },
};
export const STRIKE_FLASH = { r: 80, alpha: 0.5, ramp: 0.12 }; // the one light this world adds: a soft butter glow at the strike
const NAMES = ['BONK', 'DOUBLE BONK', 'TRIPLE BONK']; // by the link, the last for every link beyond
const NAME_COLORS = ['#ffe14a', '#ffb020', '#ff6a3a']; // butter, amber, coral: hotter as the chain builds
const TOK = '#fff4dc';
const BOING = '#aac8ff'; // sky blue: a clear step from the wall's green and the waterline's cream, and not teal

// The world's own colours (looks/w19.js: palette.alien, and the room's soap, cream and water).
export const TOY = { grunt: '#ffc928', diver: '#ff8fb8', gunner: '#b6e84a', armored: '#f08a3c', carrier: '#9cc4ee' };
const FOAM = ['#ffffff', '#fff4dc', '#ffe9c4'];
const STARS = ['#ffe14a', '#fff6c8', '#ffb020'];
const WATER = ['#ffffff', '#d4e8ff', '#9fd0ff'];
const FLAT = ['#e9eedd', '#cdd6c0', '#fff4dc']; // a puff going flat

// How each kind of particle moves: speed, life and size are [lo, hi]; grow is px/s; `at` and `spread` aim a spray (radians).
const PUFF = { speed: [80, 240], life: [0.45, 0.8], size: [7, 13], grow: -7, gravity: 50, drag: 3 };
const STAR = { speed: [180, 420], life: [0.5, 0.9], size: [5, 8], grow: -4, gravity: 320, drag: 1.6, lift: -80, star: true };
const DROP = { at: -Math.PI / 2, spread: 0.9, speed: [220, 520], life: [0.5, 0.9], size: [3.5, 7], grow: -2, gravity: 900, drag: 0.3 };
export const TRAIL = { speed: [260, 800], life: [0.25, 0.45], size: [5, 9], grow: -9, gravity: 0, drag: 4, spread: 0.1 };

const inBath = (world) => world?.level?.world === BATH_WORLD;

// k opaque particles from (x, y) by recipe `o` in `colors`: all ways round, or in a spray about o.at.
function suds(fx, rng, x, y, k, o, colors) {
  for (let i = 0, m = count(fx, k); i < m; i++) {
    const a = o.at === undefined ? rng() * TAU : o.at + between(rng, -o.spread, o.spread);
    const v = between(rng, o.speed[0], o.speed[1]);
    addParticle(fx, {
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.lift ?? 0), life: between(rng, o.life[0], o.life[1]),
      size: between(rng, o.size[0], o.size[1]), grow: o.grow, color: pick(rng, colors), kind: 'suds', star: o.star === true,
      gravity: o.gravity, drag: o.drag,
    });
  }
}

// The knock-out: puffs in the toy's colour and foam, three little stars, and the score (react-fight.js's, as every world shows it).
function knockOut(fx, ev, rng) {
  const toy = TOY[ev.role] ?? TOY.grunt;
  suds(fx, rng, ev.x, ev.y, ev.role === 'carrier' ? COUNTS.knockCarrier : COUNTS.knock, PUFF, [toy, toy, ...FOAM]);
  suds(fx, rng, ev.x, ev.y - 6, COUNTS.knockStars, STAR, STARS);
  if (ev.scored) scorePopup(fx, ev);
}

export const killFor = (usual) => (fx, ev, rng, world) => {
  if (inBath(world)) knockOut(fx, ev, rng);
  else usual(fx, ev, rng, world);
};

// An alien or part going: a puff of foam. The ship's blast and the boss's last one stay as they are.
export const explodeFor = (usual) => (fx, ev, rng, world) => {
  if (!inBath(world) || blastSize(ev) !== 1) {
    usual(fx, ev, rng, world);
    return;
  }
  suds(fx, rng, ev.x, ev.y, COUNTS.foam, { ...PUFF, size: [8, 15], speed: [100, 260] }, FOAM);
  addShake(fx, SHAKE);
};

// A body batted: puffs trailing it along the launch, which flies faster than any of them.
function whack(fx, ev, rng) {
  suds(fx, rng, ev.x, ev.y, COUNTS.trail, { ...TRAIL, at: Math.atan2(ev.dy ?? -1, ev.dx ?? 0) }, FOAM);
}

const popScale = (link) => POP_BASE + ((POP_TOP - POP_BASE) * clamp(link, 0, STRIKE_AT)) / STRIKE_AT;

// A bonk lands at (x, y): a starburst (bigger down a chain) and the word, under the spot (the kill's score rises over it).
function bonk(fx, ev, rng) {
  const link = Math.max(0, ev.link | 0);
  const word = ev.ko ? Math.min(link, NAMES.length - 1) : -1; // a stopper says TOK, whatever its link
  suds(fx, rng, ev.x, ev.y, ev.ko ? Math.min(COUNTS.starsKo + link, COUNTS.starsKoMax) : COUNTS.starsTok, STAR, STARS);
  addPopup(fx, {
    x: ev.x, y: ev.y + POP.bonk.dy, text: word < 0 ? 'TOK' : NAMES[word], color: word < 0 ? TOK : NAME_COLORS[word],
    scale: popScale(ev.ko ? link : 0), life: POP.bonk.life, vy: POP.bonk.vy,
  });
}

// A body banked off a wall: puffs sprung back toward the middle, and BOING.
function bank(fx, ev, rng) {
  const pop = POP.bank;
  suds(fx, rng, ev.x, ev.y, COUNTS.bank, { ...PUFF, at: ev.x < MID_X ? 0 : Math.PI, spread: 0.7, speed: [150, 320] }, FOAM);
  addPopup(fx, { x: clamp(ev.x, pop.edge, WIDTH - pop.edge), y: ev.y + pop.dy, text: 'BOING', color: BOING, scale: pop.scale, life: pop.life, vy: pop.vy });
}

// Four in a row, and the room answers: the tagged flash the taps read, a burst of stars and STRIKE! over the lot.
function strike(fx, ev, rng) {
  const pop = POP.strike;
  addFlash(fx, { x: ev.x, y: ev.y, ...STRIKE_FLASH, color: '#fff0b8', life: STRIKE_LIFE, tag: 'strike' });
  suds(fx, rng, ev.x, ev.y, COUNTS.strike, { ...STAR, speed: [260, 560] }, STARS);
  addShake(fx, STRIKE_SHAKE);
  addPopup(fx, { x: clamp(ev.x, pop.edge, WIDTH - pop.edge), y: ev.y + pop.dy, text: 'STRIKE!', color: '#ffe14a', scale: STRIKE_SCALE, life: pop.life, vy: pop.vy });
}

// A body sunk past the foot of the field: a splash of droplets at the waterline.
function plop(fx, ev, rng) {
  suds(fx, rng, clamp(ev.x, 0, WIDTH), WATERLINE, COUNTS.plop, DROP, WATER);
}

// A body spent: a few puffs going flat, and PFFT.
function fizzle(fx, ev, rng) {
  const pop = POP.fizzle;
  suds(fx, rng, ev.x, ev.y, COUNTS.fizzle, { ...PUFF, speed: [30, 90], grow: -5 }, FLAT);
  addPopup(fx, { x: ev.x, y: ev.y + pop.dy, text: 'PFFT', color: '#e6efd0', scale: pop.scale, life: pop.life, vy: pop.vy });
}

export const BATH = { kill: killFor(DEEP.kill), explode: explodeFor(FIGHT.explode), whack, bonk, bank, strike, plop, fizzle };
