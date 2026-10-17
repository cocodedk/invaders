// Tiny DOM helpers shared by the screens (from Barrage): element building, focusable buttons, and
// arrow-key navigation over a list or grid that keeps mouse hover and keyboard focus in step.
import { play } from '../audio.js';

export function h(tag, cls, ...kids) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const k of kids) if (k != null && k !== false) el.append(k);
  return el;
}

// Restart a CSS animation class: remove it, force a reflow, add it back.
export function replayClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function focusItem(el) {
  if (!el || el === document.activeElement) return;
  el.focus({ preventScroll: true });
  play('move');
}

export function button(label, onPick, cls = 'btn') {
  const b = h('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', () => onPick());
  b.addEventListener('pointerenter', () => focusItem(b));
  return b;
}

// Move focus among `items` (elements in reading order) with the arrows; `cols` > 1 is a grid.
// A plain list (cols 1) wraps around and takes left/right as well, for menus laid out in a row.
// Enter / Space pick the focused item. Returns true when the key was handled.
export function navigate(items, code, cols = 1) {
  const i = items.indexOf(document.activeElement);
  const step = { ArrowUp: -cols, ArrowDown: cols, KeyW: -cols, KeyS: cols, ArrowLeft: -1, ArrowRight: 1, KeyA: -1, KeyD: 1 };
  if (code in step) {
    if (i < 0) return focusItem(items[0]), true; // focus went astray: start over at the top
    let j = i + step[code];
    if (cols === 1) j = (j + items.length) % items.length;
    if (j >= 0 && j < items.length) focusItem(items[j]);
    return true;
  }
  if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    const el = items.includes(document.activeElement) ? document.activeElement : items[0];
    el.click();
    return true;
  }
  return false;
}

// A screen shell: <section class="screen {cls}"> with an optional heading.
export function shell(cls, title) {
  const el = h('section', `screen ${cls}`);
  if (title) el.append(h('h2', 'screen-title', title));
  return el;
}

// Stars as glyphs: n filled of 3, each a span the CSS lights.
export function starRow(n, cls = 'stars') {
  return h('span', cls, ...[0, 1, 2].map((i) => h('i', i < n ? 'on' : null, '★')));
}

// A guard for end-of-level cards: fire-button mashing at the end must not skip them.
export function armed(ms = 450) {
  const shown = performance.now();
  return () => performance.now() - shown >= ms;
}
