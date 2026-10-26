// Keyboard and mouse, adapted from Barrage. Held keys live in `down`; presses also land in `taps`
// until the next tick reads them, so a tap shorter than a frame still fires or bombs. The pointer
// steers once it moves (or clicks) and hands back to the keys as soon as a movement key is pressed.
// Controls (spec): arrows/WASD move · Space fires (hold for auto-fire) · B or Shift bombs ·
// P/Esc pauses · M mutes · Enter confirms. Mouse: the ship eases toward the pointer, the left
// button fires, the right button bombs.
//   createInput(canvas) -> input   input.onKey(code, event) for screens and global keys,
//                                  input.onGesture() on the first key or click (audio unlock)
//   readInput(input, view, zone) -> raw  { dx, dy, fire, bomb, target } for quantizeInput; zone: the
//                                  level's (ship.js zoneOf), ZONE by default
//   resetInput(input)              forget held keys and buttons (a screen took over)
// Keys with Alt, Ctrl or Meta held are left alone: Alt+Left must stay the browser's Back.
import { MOVE } from './keys.js';
import { ZONE } from '../core/ship.js';
import { clamp } from '../core/math.js';

const FIRE = ['Space'];
const BOMB = ['KeyB', 'ShiftLeft', 'ShiftRight'];
const GAME_KEYS = new Set([...Object.keys(MOVE), 'Space', 'Enter', 'NumpadEnter', 'Escape', 'Tab']);

export function createInput(canvas) {
  const input = {
    canvas, down: new Set(), taps: new Set(),
    mouse: { x: 0, y: 0, left: false, right: false, active: false, slack: null },
    onKey: null, onGesture: null,
  };
  const m = input.mouse;
  const gesture = () => input.onGesture?.();

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    gesture();
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) {
      if (MOVE[e.code]) input.onKey?.(e.code, e); // menus scroll on a held arrow
      return;
    }
    input.down.add(e.code);
    input.taps.add(e.code);
    if (MOVE[e.code]) m.active = false; // the keys take the ship back from the pointer
    input.onKey?.(e.code, e);
  });
  addEventListener('keyup', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault(); // no native button click on Space-up
    input.down.delete(e.code);
  });
  addEventListener('blur', () => resetInput(input)); // key-ups are lost while unfocused

  addEventListener('pointermove', (e) => {
    if (e.clientX === m.x && e.clientY === m.y) return; // a synthetic move at rest is not steering
    m.x = e.clientX;
    m.y = e.clientY;
    m.active = true;
    if (m.left && !(e.buttons & 1)) m.left = false; // its pointerup went missing
    if (m.right && !(e.buttons & 2)) m.right = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    Object.assign(m, { x: e.clientX, y: e.clientY, active: true });
    if (e.button === 0) m.left = true;
    if (e.button === 2) m.right = true;
    input.taps.add(`Mouse${e.button}`);
    try {
      canvas.setPointerCapture(e.pointerId); // the pointerup arrives even outside the window
    } catch {
      // the pointer is already gone: the buttonless-move check above releases it
    }
  });
  addEventListener('pointerup', (e) => {
    if (e.button === 0) m.left = false;
    if (e.button === 2) m.right = false;
  });
  addEventListener('pointercancel', () => { m.left = false; m.right = false; });
  addEventListener('pointerdown', gesture);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

// A screen took over or a level starts: nothing held, and the pointer steers again only once it moves.
export function resetInput(input) {
  input.down.clear();
  input.taps.clear();
  input.mouse.active = false;
  input.mouse.left = false;
  input.mouse.right = false;
  input.mouse.slack = null;
}

const any = (input, codes) => codes.some((c) => input.down.has(c) || input.taps.has(c));

// The pointer and the canvas's corners in world px, through the view's letterbox fit (view.js).
function inWorld(view, m) {
  const c = view.canvas;
  const r = c.getBoundingClientRect();
  const f = view.fit;
  if (!r.width || !r.height || !f.s) return null;
  const at = (x, y) => ({
    x: (((x - r.left) * c.width) / r.width - f.ox) / f.s,
    y: (((y - r.top) * c.height) / r.height - f.oy) / f.s,
  });
  return { p: at(m.x, m.y), lo: at(r.left, r.top), hi: at(r.right, r.bottom) };
}

// One axis of the goal: the pointer plus its slack, held on the zone [z0, z1]. The slack is what a push
// past an edge built up, never more than the canvas [w0, w1] can take back, so every spot of the zone
// stays in reach of a pointer inside the window.
function axis(p, s, z0, z1, w0, w1) {
  const g = clamp(p + s, z0, z1);
  return [g, clamp(g - p, z1 - w1, z0 - w0)];
}

// The ship's goal. The cursor is hidden in play and the canvas reaches past the zone (the sky above
// it, the letterbox bars of a wide window beside it), so a pointer pushed past an edge drags the goal
// along that edge instead of leaving a dead stretch to cross back: a move back answers at once.
function steer(m, view, z) {
  const w = inWorld(view, m);
  if (!w) return null;
  const s = m.slack ?? { x: 0, y: 0 };
  const [x, sx] = axis(w.p.x, s.x, z.x0, z.x1, w.lo.x, w.hi.x);
  const [y, sy] = axis(w.p.y, s.y, z.y0, z.y1, w.lo.y, w.hi.y);
  m.slack = { x: sx, y: sy };
  return { x, y };
}

export function readInput(input, view, zone = ZONE) {
  let dx = 0;
  let dy = 0;
  for (const code of input.down) {
    const mv = MOVE[code];
    if (!mv) continue;
    dx += mv[0];
    dy += mv[1];
  }
  const m = input.mouse;
  if (!m.active) m.slack = null; // the keys have the ship: the pointer starts from where it is again
  const raw = {
    dx, dy,
    fire: any(input, FIRE) || m.left || input.taps.has('Mouse0'),
    bomb: any(input, BOMB) || m.right || input.taps.has('Mouse2'),
    target: m.active ? steer(m, view, zone) : null,
  };
  input.taps.clear(); // read by this tick
  return raw;
}
