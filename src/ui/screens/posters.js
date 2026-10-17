// The lobby's posters, drawn by the game itself: each world's boss level is run a few seconds with
// the autopilot and one frame of it is rendered (sky, parallax, boss, ship, effects; no HUD), then
// cropped to a 2:3 poster round the boss. Baked on demand, one per call, and kept for the session (no image files).
//   posterFor(world) -> canvas | null (null until baked)   bakePoster(world) -> canvas
//   TAGLINES[world - 1]: each world's poster line (original copy)   reelName(level)
import { LEVELS } from '../../core/levels.js';
import { autopilot } from '../../core/autopilot.js';
import { TICK } from '../../core/kinds.js';
import { createSession, stepSession } from '../session.js';
import { createView, drawFrame } from '../view.js';
import { makeCanvas } from '../sprites.js';

export const TAGLINES = [
  'Where it all began.',
  'The city never sleeps. Neither do they.',
  'Two suns. One way out.',
  'Steel beneath the blossoms.',
  'They hatch in the dark.',
  'The signal has teeth.',
  'The machines woke first.',
  'Even light bends here.',
];

export const reelName = (level) => (level.boss ? 'Finale' : `Reel ${level.index}`);

const FRAME_W = 768;
const FRAME_H = 432;
const AT = [3.6, 3.4, 3.6, 3.4, 3.4, 3.4, 3.4, 3.8]; // s into each boss fight: in place, mid-attack
const posters = new Map();

export const posterFor = (world) => posters.get(world) ?? null;

// The crop, in world px: a 2:3 window over the top of the field, centred on the boss.
const CROP_W = 600;
const CROP_H = 900;

export function bakePoster(world) {
  if (posters.has(world)) return posters.get(world);
  const level = LEVELS.find((l) => l.world === world && l.boss);
  const s = createSession(level, level.seed, { record: false });
  const secs = AT[world - 1] ?? 3.4;
  for (let i = 0, n = Math.round(secs / TICK); i < n; i++) stepSession(s, TICK, autopilot);
  const frame = makeCanvas(FRAME_W, FRAME_H);
  const view = createView(frame, level);
  view.showHud = false;
  drawFrame(view, s.world, s.fx, secs);
  const { s: k, ox, oy } = view.fit;
  const x0 = Math.max(0, Math.min(1920 - CROP_W, (s.world.boss?.x ?? 960) - CROP_W / 2));
  const out = makeCanvas(CROP_W * k, CROP_H * k);
  out.getContext('2d').drawImage(frame, ox + x0 * k, oy, CROP_W * k, CROP_H * k, 0, 0, out.width, out.height);
  out.className = 'poster-canvas';
  posters.set(world, out);
  return out;
}
