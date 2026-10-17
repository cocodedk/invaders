// ?debug only (never in normal play): globalThis.invaders, test hooks that reach into the running
// level. Each hook that changes the world taints the recording (session.js taint), so a run a hook
// touched is never stored as a replay.
//   info()            where the game is: screen, level, state, score, lives, power, bombs, recording
//   play(id)          jump to a level ('w2-1')              lobby() title() demo() try()
//   grant(kind)       drop a pickup on the ship: 'spread' | 'laser' | 'rapid' | 'shield' | 'bomb'
//   clear(hits?)      empty the field now (a boss level runs its death chain); hits sets the stars
//   fail()            the last life goes
// With ?debug&level=w2-1 the game boots straight into that level.
import { levelById } from '../core/levels.js';
import { FALL, PICKUP_R } from '../core/powerups.js';
import { syncBoss } from '../core/boss-phase.js';
import { taint } from './session.js';
import { audioStats } from './audio.js';

export function installDebug(r) {
  const q = new URLSearchParams(location.search);
  if (!q.has('debug')) return null;
  const { app } = r;
  const live = () => {
    const sc = app.scene;
    return sc && (sc.mode === 'play' || sc.mode === 'try') ? sc : null;
  };
  const touch = (fn) => {
    const sc = live();
    if (!sc || sc.session.world.state !== 'play') return false;
    taint(sc.session);
    fn(sc.session.world);
    return true;
  };
  globalThis.invaders = {
    info() {
      const sc = app.scene;
      const w = sc?.session.world;
      return {
        screen: app.screen, mode: sc?.mode ?? null, level: sc?.level.id ?? null, state: w?.state ?? null,
        tick: w?.tick ?? 0, score: w?.score ?? 0, lives: w?.ship.lives ?? 0, bombs: w?.ship.bombs ?? 0,
        power: w?.ship.power?.kind ?? null, hits: w?.hits ?? 0, inputs: sc?.session.inputs.length ?? 0,
        events: sc?.session.events.length ?? 0, tainted: sc?.session.tainted ?? false,
        quality: sc?.view.quality.level ?? null, caption: app.demo?.d?.caption ?? null, audio: audioStats(),
      };
    },
    play(id) {
      const level = levelById(id);
      if (level) r.startLevel(level);
      return Boolean(level);
    },
    grant: (kind = 'spread') => touch((w) => {
      w.pickups.push({ kind, x: w.ship.x, y: w.ship.y, vy: FALL, r: PICKUP_R });
    }),
    clear: (hits) => touch((w) => {
      if (Number.isInteger(hits)) w.hits = hits;
      if (w.boss) {
        for (const p of w.boss.parts) p.hp = 0;
        syncBoss(w);
        return;
      }
      w.aliens.length = 0;
      w.wrecks.length = 0;
      w.gap = null;
      w.wave = w.level.waves.length;
    }),
    fail: () => touch((w) => { w.ship.lives = 0; }),
    lobby: () => r.goLobby(),
    title: () => r.goTitle(),
    demo: () => r.startDemo(),
    try: () => r.startTry(),
  };
  return q.get('level') ? levelById(q.get('level')) ?? null : null;
}
