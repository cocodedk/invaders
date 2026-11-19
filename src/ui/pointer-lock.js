// Pointer lock while a level is played. The cursor is hidden in play, and a pointer that leaves the window
// with no button held sends no more pointermove, so on a two-monitor desktop the ship froze at the edge
// until the hidden pointer came back. A locked pointer cannot leave: its moves arrive as movementX/Y, which
// lockedMove adds to the steering position, held on the canvas as the window's edge held it.
//   lockedMove(m, e, rect) -> boolean  one locked pointermove applied to m.x/m.y; false for no movement
//   createLock(canvas, input) -> { held, ask, release }
//     input.playing()    true while the ship is flown (not paused, not another screen)
//     input.onLockLost() the browser took the lock (Esc) during play: the owner pauses
// A refused or missing lock (no gesture, a kiosk, a touch screen, no API) changes nothing: the input is then
// the absolute pointer it always was.
import { clamp } from '../core/math.js';

// m.x/m.y are client px, as the unlocked pointermove sets them; clientX/Y are frozen under lock, so only the
// movement counts. A pointer the page never saw (m.x null) starts at the canvas's centre.
export function lockedMove(m, e, rect) {
  const dx = e.movementX || 0;
  const dy = e.movementY || 0;
  if (!dx && !dy) return false;
  m.x = clamp((m.x ?? (rect.left + rect.right) / 2) + dx, rect.left, rect.right);
  m.y = clamp((m.y ?? (rect.top + rect.bottom) / 2) + dy, rect.top, rect.bottom);
  return true;
}

export function createLock(canvas, input) {
  const held = () => document.pointerLockElement === canvas;
  // The browser drops the lock on Esc and may not hand the page that keydown: one Esc still pauses.
  document.addEventListener('pointerlockchange', () => {
    if (!held() && input.playing?.()) input.onLockLost?.();
  });
  return {
    held,
    // Needs a user gesture (a mouse press or a key): called from those handlers while the ship is flown.
    ask() {
      if (held() || !input.playing?.()) return;
      try {
        canvas.requestPointerLock()?.catch?.(() => {}); // older browsers return nothing, newer ones a promise
      } catch {
        // refused: the input stays absolute
      }
    },
    release() {
      if (!held()) return;
      try {
        document.exitPointerLock();
      } catch {
        // already gone
      }
    },
  };
}
