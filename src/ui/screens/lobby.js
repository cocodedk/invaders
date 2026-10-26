// Level select as a cinema lobby: a poster per world (its boss fight, rendered by the game) with
// five reels showing best stars and best score. The main run's worlds stand in the first row, each
// poster over its reels; under them, "also showing", the side worlds (difficulty.js isSide), each a
// short banner over its reels (lobby.css). Every reel is open from the start.
// Keys (lobby-nav.js): left/right change world within a row (same reel), up/down change reel and
// run on into the nearest world of the row below or above (the one at the same place when two tie:
// lobby-nav.js step), down from the last row's last reel reaches Back, Enter plays, Esc goes back.
// Back and Reset scores stand side by side under the reels, and a free-flight world (world 18, one reel)
// stands beside them as a compact "Sneak preview" card, in neither row: right and left move among Back,
// Reset scores and the preview's reel, up returns to the last reel, Enter plays. Reset scores asks first
// (confirm.js, laid over the lobby: Cancel is focused, Esc cancels) and then calls reset(). The mouse
// focuses on hover and plays on click.
// Under the title: the star total, and the pilot's rank with the medals it is read from. A reel
// whose level holds its medal (cleared without a power-up) carries the medal mark on its number.
//   lobbyScreen({ best, start(level), back(), reset(), focusId }) -> screen   best: storage allBest()
// Posters not baked yet (posters.js bakes them in idle slices) show their sky, and develop in as
// soon as they are ready (update).
import { LEVELS, WORLDS, reelName, worldName } from '../../core/levels.js';
import { bossDef } from '../../core/bosses-data.js';
import { lookFor } from '../looks/index.js';
import { play } from '../audio.js';
import { h, button, focusItem, shell, starRow, skyCss, developer } from './dom.js';
import { fmt } from '../format.js';
import { MOVE, isConfirm, isBack } from '../keys.js';
import { confirmCard } from './confirm.js';
import { medalCount } from '../storage.js';
import { rankOf } from '../../core/ranks.js';
import { MAX_STARS } from '../../core/scoring.js';
import { TAGLINES, posterFor } from './posters.js';
import { step } from './lobby-nav.js';
import { isSide } from '../../core/difficulty.js';

function reel(level, best, start) {
  const b = best[level.id];
  const r = button(null, () => { play('select'); start(level); }, `reel${level.boss ? ' finale' : ''}${b ? ' played' : ''}`);
  r.dataset.id = level.id;
  const n = h('span', 'reel-n', String(level.index));
  if (b?.medal) n.append(h('i', 'medal')); // pinned to the number badge: it takes no width from the score
  r.append(n, starRow(b?.stars ?? 0), h('span', 'reel-best', b ? fmt(b.score) : '—'));
  r.setAttribute('aria-label', `${worldName(level)}, ${reelName(level).toLowerCase()}`);
  return r;
}

// A world's card: its poster over its reels, or, for a free-flight world, the compact preview (no boss
// to bill: the world has none), its banner beside its one reel.
function poster(world, best, start) {
  const look = lookFor({ world: world.id });
  const art = h('div', 'poster-art');
  art.style.background = skyCss(look);
  const canvas = posterFor(world.id);
  if (canvas) art.append(canvas);
  art.append(
    h('span', 'poster-world', world.free ? 'Sneak preview' : `World ${world.id}`),
    h('div', 'poster-type',
      h('h3', 'poster-name', world.name),
      h('p', 'poster-tag', TAGLINES[world.id - 1]),
      !world.free && world.boss && h('p', 'poster-bill', 'Featuring ', h('b', null, bossDef(world.boss).name))));
  const reels = LEVELS.filter((l) => l.world === world.id).map((l) => reel(l, best, start));
  const el = h('article', world.free ? 'preview' : 'poster', art, h('div', 'reels', ...reels));
  el.style.setProperty('--accent', look.palette.accent);
  return { el, art, reels, world: world.id, free: world.free };
}

const RESET_TEXT = 'This resets the best score, stars and medal of every level. '
  + 'Your saved trailers stay in Cinema. It cannot be undone.';

export function lobbyScreen({ best, start, back, reset, focusId = 'w1-1' }) {
  const el = shell('lobby');
  const cols = WORLDS.map((w) => poster(w, best, start));
  const previews = cols.filter((c) => c.free); // the sneak preview stands in the foot, in neither row
  const rows = [false, true].map((side) => cols.flatMap((c, i) => (!c.free && isSide(c.world) === side ? [i] : [])))
    .filter((row) => row.length);
  const total = Object.values(best).reduce((n, b) => n + b.stars, 0);
  const medals = medalCount(best);
  let ask = null; // the open Reset scores card
  const backBtn = button('Back', () => { play('back'); back(); }, 'btn');
  const resetBtn = button('Reset scores', () => {
    play('select');
    ask = confirmCard({ title: 'Reset scores?', text: RESET_TEXT, yes: 'Reset' }, () => { play('select'); reset(); }, () => {
      play('back');
      ask.el.remove();
      ask = null;
      resetBtn.focus({ preventScroll: true });
    });
    el.append(ask.el);
    void ask.el.offsetWidth; // commit the start state so the fade-in runs
    ask.el.classList.add('show');
    ask.focus.focus({ preventScroll: true });
  }, 'btn');
  const foot = [backBtn, resetBtn, ...previews.flatMap((c) => c.reels)];
  el.append(
    h('header', 'marquee', h('span', 'bulbs'), h('h2', 'marquee-title', 'Now showing'), h('span', 'bulbs')),
    h('p', 'sub', `${WORLDS.length} worlds, ${LEVELS.length} reels. Every one is open. `,
      h('span', 'lobby-total', `★ ${total} / ${LEVELS.length * MAX_STARS}`),
      h('span', 'lobby-rank', `Rank ${rankOf(medals).name} · ${medals} / ${LEVELS.length} medals`)),
    h('div', 'posters', ...rows[0].map((i) => cols[i].el)),
    rows[1] && h('div', 'side', h('span', 'side-label', 'Also showing'), ...rows[1].map((i) => cols[i].el)),
    h('div', 'row', backBtn, resetBtn, ...previews.map((c) => c.el), h('span', 'hint', '← → world · ↑ ↓ reel · Enter play · Esc back')));
  const grid = cols.map((c) => c.reels);
  const first = grid.flat().find((r) => r.dataset.id === focusId) ?? grid[0][0];
  let lastReel = foot.includes(first) ? grid[rows.at(-1).at(-1)].at(-1) : first; // up from the foot lands on a reel above
  const where = (el2) => {
    for (let w = 0; w < grid.length; w++) {
      const r = grid[w].indexOf(el2);
      if (r >= 0) return [w, r];
    }
    return null;
  };
  return {
    el, focus: first,
    onKey(code) {
      if (ask) return ask.onKey(code), true; // the card is modal
      if (isBack(code)) return backBtn.click(), true;
      const at = where(document.activeElement);
      const f = foot.indexOf(document.activeElement);
      if (f >= 0) {
        const [dx, dy] = MOVE[code] ?? [0, 0];
        if (dy < 0) focusItem(lastReel);
        else if (dx) focusItem(foot[f + dx]);
        else if (isConfirm(code)) foot[f].click();
        return true;
      }
      if (!at) return focusItem(lastReel), true;
      const move = MOVE[code];
      if (move) {
        lastReel = document.activeElement;
        const to = step(at, move, rows, grid.map((g) => g.length));
        return focusItem(to ? grid[to[0]][to[1]] : backBtn), true;
      }
      if (isConfirm(code)) return document.activeElement.click(), true;
      return false;
    },
    update: developer(cols, posterFor), // a poster that has just been baked develops in
  };
}
