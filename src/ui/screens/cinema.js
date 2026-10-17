// Cinema: every level whose best run is saved, as a listing of showings (the world's poster, the
// reel, the stars and the box office); Enter plays its trailer, Esc goes back to the title.
// Arrows move through the grid, down from the last row reaches Back.
//   cinemaScreen({ reels: [{ level, run }], play(reel), back(), focusId }) -> screen
// Posters not baked yet show their sky and develop in once they are (posters.js, as the lobby).
import { WORLDS } from '../../core/levels.js';
import { TICK } from '../../core/kinds.js';
import { lookFor } from '../looks/index.js';
import { play as sound } from '../audio.js';
import { h, button, focusItem, shell, starRow } from './dom.js';
import { posterFor, reelName } from './posters.js';

const COLS = 3;
const fmt = (n) => n.toLocaleString('en-US');
const runtime = (ticks) => {
  const s = Math.floor(ticks * TICK);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const skyCss = (look) => `linear-gradient(180deg, ${look.sky.map(([s, c]) => `${c} ${s * 100}%`).join(', ')})`;

// A copy of the world's poster: the lobby keeps the original canvas.
function thumb(world) {
  const src = posterFor(world);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = 120;
  c.height = 180;
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  c.className = 'showing-canvas';
  return c;
}

function showing(reel, pick) {
  const { level, run } = reel;
  const look = lookFor(level);
  const art = h('span', 'showing-art');
  art.style.background = skyCss(look);
  const c = thumb(level.world);
  if (c) art.append(c);
  const b = button(null, () => pick(reel), 'showing');
  b.dataset.id = level.id;
  b.style.setProperty('--accent', look.palette.accent);
  b.append(art, h('span', 'showing-info',
    h('span', 'showing-world', WORLDS[level.world - 1].name),
    h('span', 'showing-reel', `${reelName(level)} · ${runtime(run.ticks)}`),
    starRow(run.stars),
    h('span', 'showing-box', h('small', null, 'Box office'), fmt(run.score))));
  b.setAttribute('aria-label', `${WORLDS[level.world - 1].name}, ${reelName(level)}: play the trailer`);
  return { el: b, art, world: level.world };
}

export function cinemaScreen({ reels, play, back, focusId = null }) {
  const el = shell('cinema');
  const pick = (reel) => {
    sound('select');
    play(reel);
  };
  const tiles = reels.map((r) => showing(r, pick));
  const items = tiles.map((t) => t.el);
  const backBtn = button('Back', () => { sound('back'); back(); }, 'btn');
  const body = items.length
    ? h('div', 'showings', ...items)
    : h('div', 'cinema-empty', h('p', 'cinema-empty-title', 'No trailers yet'),
      h('p', 'sub', 'Clear a level and your best run premieres here, cut as a movie trailer.'));
  el.append(
    h('header', 'marquee', h('span', 'bulbs'), h('h2', 'marquee-title', 'Cinema'), h('span', 'bulbs')),
    h('p', 'sub', 'Your best runs, cut as trailers.'),
    body,
    h('div', 'row', backBtn, h('span', 'hint', items.length ? 'Arrows choose · Enter watch · Esc back' : 'Esc back')));
  for (const it of items) it.addEventListener('focus', () => it.scrollIntoView({ block: 'nearest' }));
  const first = items.find((b) => b.dataset.id === focusId) ?? items[0] ?? backBtn;
  return {
    el, focus: first,
    onKey(code) {
      if (code === 'Escape' || code === 'Backspace') return backBtn.click(), true;
      const at = document.activeElement;
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') return (items.includes(at) || at === backBtn ? at : first).click(), true;
      const i = items.indexOf(at);
      const step = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -COLS, KeyW: -COLS, ArrowDown: COLS, KeyS: COLS }[code];
      if (step === undefined) return false;
      if (at === backBtn) {
        if (step < 0 && items.length) focusItem(items[Math.min(items.length - 1, items.length - 1 - ((items.length - 1) % COLS))]);
        return true;
      }
      if (i < 0) return focusItem(first), true;
      const j = i + step;
      const lastRow = Math.floor((items.length - 1) / COLS);
      if (j >= items.length && step === COLS) focusItem(Math.floor(i / COLS) < lastRow ? items.at(-1) : backBtn);
      else if (j >= 0 && j < items.length) focusItem(items[j]);
      return true;
    },
    update() { // a poster that has just been baked develops in
      for (const t of tiles) {
        if (t.art.querySelector('canvas')) continue;
        const c = thumb(t.world);
        if (!c) continue;
        t.art.prepend(c);
        t.art.classList.add('develop');
      }
    },
  };
}
