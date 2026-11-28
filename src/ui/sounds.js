// Core events to sounds. DOM-free: `play(name, opts)` is passed in (audio.js play in the game), so
// the mapping is tested in node. Every event type the core emits is either sounded here or listed
// in SILENT with the reason.
//   eventSounds(events, world, play)   once per tick, with that tick's events
// Alien deaths sound through `kill` (by role, with the combo); their `explode` is the same moment, so
// only blasts with no kill of their own sound: the boss's death chain (swelling as it runs, k 0..1),
// the ship's wreck (size 2) and the final white-out blast (size 3). World 13's rules sound through their
// own events: the broadside's opening and closing, each side shot (a cannon, left or right), and the
// escorts' rattle with the ship's shot while the wingmen run (the fire event's power). World 14's firework
// shells sound through `burst`, pitched by where and how far down the chain it goes off (sfx-carnival.js).
// World 15's pearls sound where they wipe a bullet (`pearlBlock`) or strike an alien (`pearlHit`), and each
// trident shot adds a zip to the ship's own shot, which keeps the beat (sfx-deep.js). World 16's mirror twin
// pings with every shot of the ship, at the twin's x on the other side of the field (sfx-glass.js). World 17's
// help sounds when a wave of fresh air starts to rise (`breath`, as long as the rise) and ticks for each enemy bullet
// it wipes (`cleanse`, at the bullet's x, thinned hard in audio.js), sfx-breath.js. World 18's side guns sound through world 13's
// events (the patches branch on the world's sound style, sfx-storm.js), and a `backfire` (an enemy bullet turned on the first alien it
// crosses, or on a boss's part, at its x) sounds a crack and a struck-iron ring. The Squall Ray's roar, at each
// `bossPhase` and at its `bossDeath`, is a thunderclap in that style (sfx-storm.js squallRoar, picked by sfx-boss.js).
// World 19's batting rule sounds through its own events (sfx-bath.js): the bat's `whack`, a flying body's `bonk` (its link and
// whether it struck the boss), a `bank` off a wall, a `strike`, a `plop` out at the bottom and a `fizzle`; at most TWIST_VOICES of
// them a tick and one of each kind (audio.js thins each further with a GAP). Its knock-outs are kills, which squeak there.
// World 21's returning arrow chimes where it turns (`arrowTurn`, at its x: sfx-isle.js pitches it by x).
// World 22's ground things sound as aliens do, through `kill` and `hit`, so audio.js thins them with the same gaps under auto-fire: a break
// (`groundKill`) is a kill at the combo it raised (the event says it: mult), a strike that leaves it standing (`groundHit`)
// a hit. A pillar and a gate, the big ones, sound as an armored alien, the rest as a grunt. The rest of its events have sounds of their own
// (sfx-road.js): a lantern chime at a `checkpoint`, a glow at an `ability` (at the ship, the event has no x), a pop at a `seedBurst`, a crack
// at a struck bullet (`chip`) and at a broken one (`cut`, which the road's style cracks), a swell at a `respawn`, a pencil scratch at a `lineStop`, a twig's snap after a thorn's break, a flood and a chord at a
// `holdBreak`; and a kite shot down (a `kill` in this world: the ground's breaks are `groundKill`s) flutters, a paper rustle over the kill's stab.
import { THORN } from '../core/course-kinds.js';
import { CHAIN } from '../core/boss-phase.js';
import { MID_X, WIDTH } from '../core/kinds.js';
import { BIG_GROUND } from '../fx/react-ground.js';
import { WANDER_WORLD } from './wander-kit.js';

export const SILENT = {
  lasso: 'the lasso has no sound yet (Leg 3 gives it one)',
  flockScatter: 'the flock scatters: the motes flying apart are the sign (Leg 3 may give it a flutter)',
  shardBounce: 'a shard throws a shot back: the bullet it adds is the sign (Leg 3 may give it a ping)',
  failed: 'the failed screen plays the stinger',
  cleared: 'the results screen plays the stinger after the slow motion',
};

const at = (e) => ({ x: e.x });
const groundRole = (kind) => (BIG_GROUND.includes(kind) ? 'armored' : 'grunt');
export const TWIST_VOICES = 4; // world 19's batting sounds a tick, at most
const TWIST = new Set(['whack', 'bonk', 'bank', 'strike', 'plop', 'fizzle']);
// The pickups swept up at the clear (R51) all land on one tick: each chimes this long after the last,
// a run of chimes rather than one blob.
const CHIME_GAP = 0.06;
// A side shot sounds this far out from the muzzle toward the side it flies to, so the volley opens in stereo.
const SIDE_PAN = 240;

export function eventSounds(events, world, play) {
  const dying = world.boss?.dying ?? null;
  const heard = new Set(); // the batting sounds this tick
  for (const e of events) {
    if (TWIST.has(e.type)) {
      if (heard.has(e.type) || heard.size >= TWIST_VOICES) continue;
      heard.add(e.type);
    }
    switch (e.type) {
      case 'fire':
        if (e.side === 'ship') {
          if (e.power !== 'laser') play('shot', { power: e.power, x: e.x }); // the beam hums instead
          if (e.power === 'wingmen') play('escortShot', { x: e.x }); // the two escorts fire with the ship
          if (e.power === 'trident') play('tridentZip', { x: e.x }); // the shot is still a drum hit: the zip rides on it
          if (e.power === 'mirror') play('mirrorShot', { x: WIDTH - e.x }); // the glass twin fires opposite the ship
        } else if (e.pattern === 'laser') play('laserWarn', at(e));
        else play('enemyShot', { pattern: e.pattern, boss: e.role === 'boss', x: e.x });
        break;
      case 'hit':
        if (e.role === 'boss') play('bossHit', { weak: e.weak, dmg: e.dmg, x: e.x });
        else play('hit', { role: e.role, x: e.x });
        break;
      case 'kill':
        play('kill', { role: e.role, mult: e.mult, x: e.x });
        if (world.level?.world === WANDER_WORLD) play('flutter', at(e)); // a kite is paper
        break;
      case 'explode':
        if (e.size >= 3) play('blast', at(e));
        else if (dying !== null) play('boom', { size: e.size, k: 1 - dying / CHAIN, x: e.x });
        else if (e.size === 2) play('boom', { size: 2, k: 0.5, x: e.x });
        break;
      case 'shipHit': play('shipHit', { lives: e.lives, x: e.x }); break;
      case 'shieldHit': play('shield', at(e)); break;
      case 'nearMiss': play('nearMiss', at(e)); break;
      case 'pickup': play('pickup', { kind: e.kind, x: e.x }); break;
      case 'sweep': play('pickup', { kind: e.kind, x: e.x, delay: CHIME_GAP * e.nth }); break;
      case 'power': play(e.on ? 'powerOn' : 'powerOff', { kind: e.kind }); break;
      case 'bomb': play('bomb', at(e)); break;
      case 'bunker': play('bunker', { laser: e.laser, x: e.x }); break;
      case 'waveClear': play('waveClear'); break; // the slow motion's swoop, the last wave's too
      case 'bossWarn': play('warn', { warn: e.warn, x: e.x }); break;
      case 'bossExpose': play('expose', at(e)); break;
      case 'partDown': play('partDown', at(e)); break;
      case 'bossPhase': play('phase', { phase: e.phase, open: e.open?.length > 0, x: e.x }); break;
      case 'bossDeath': play('bossDeath', at(e)); break;
      case 'lightning': play('thunder', { strength: e.strength, x: e.x }); break;
      case 'gust': if (e.wind) play('gust', { wind: e.wind, x: MID_X }); break;
      case 'cut': play('cut', at(e)); break;
      case 'acid': play('acid', at(e)); break;
      case 'teleport': play('teleport', at(e)); break;
      case 'bulletTime': play(e.on ? 'bulletOn' : 'bulletOff'); break;
      case 'wreck': play('wreck', at(e)); break;
      case 'wreckDown': play('wreckDown', at(e)); break;
      case 'reassemble': play('reassemble', at(e)); break;
      case 'absorb': play('absorb', at(e)); break;
      case 'saucer': play('saucer', { dir: e.dir, x: e.x }); break;
      case 'broadside': play(e.on ? 'broadsideOn' : 'broadsideOff', { x: e.x }); break;
      case 'sideShot': play(e.dir < 0 ? 'cannonL' : 'cannonR', { x: e.x + e.dir * SIDE_PAN }); break;
      case 'burst': play('burst', { x: e.x, depth: e.depth }); break;
      case 'pearlBlock': play('pearlBlock', at(e)); break;
      case 'pearlHit': play('pearlHit', at(e)); break;
      case 'breath': play('breath', { dur: e.dur }); break;
      case 'cleanse': play('cleanse', at(e)); break;
      case 'backfire': play('backfire', at(e)); break;
      case 'whack': play('whack', at(e)); break;
      case 'bonk': play('bonk', { link: e.link, boss: e.role === 'boss', x: e.x }); break;
      case 'bank': play('bank', at(e)); break;
      case 'strike': play('strike', at(e)); break;
      case 'plop': play('plop', at(e)); break;
      case 'fizzle': play('fizzle', at(e)); break;
      case 'arrowTurn': play('arrowTurn', at(e)); break;
      case 'groundKill':
        play('kill', { role: groundRole(e.kind), mult: e.mult ?? 1, x: e.x });
        if (e.kind === THORN) play('brambleSnap', at(e)); // a twig cracks
        break;
      case 'groundHit': play('hit', { role: groundRole(e.kind), x: e.x }); break;
      case 'checkpoint': play('checkpoint', at(e)); break;
      case 'ability': play('ability', { x: world.ship?.x }); break;
      case 'seedBurst': play('seedBurst', at(e)); break;
      case 'chip': play('chip', at(e)); break;
      case 'lineStop': play('lineScratch', at(e)); break;
      case 'respawn': play('respawn', at(e)); break;
      case 'holdBreak': play('holdBreak'); break;
      default: break; // SILENT
    }
  }
}
