// Level select as a cinema lobby: a poster per world (its boss fight, rendered by the game) with
// five reels showing best stars and best score. The main run's worlds stand in the first row, each
// poster over its reels; under them, "also showing", the side worlds (difficulty.js isSide), each a
// short banner over its reels (lobby.css). Every reel is open from the start.
// Keys (lobby-nav.js): left/right change world within a row (same reel), up/down change reel and
// run on into the nearest world of the row below or above, down from the last row's last reel
// reaches Back, Enter plays, Esc goes back. The mouse focuses on hover and plays on click.
//   lobbyScreen({ best, start(level), back(), focusId }) -> screen   best: storage allBest()
// Posters not baked yet (posters.js bakes them in idle slices) show their sky, and develop in as
// soon as they are ready (update).
import { LEVELS, WORLDS, reelName, worldName } from '../../core/levels.js';
import { bossDef } from '../../core/bosses-data.js';
import { lookFor } from '../looks/index.js';
import { play } from '../audio.js';
import { h, button, focusItem, shell, starRow, skyCss, developer } from './dom.js';
import { fmt } from '../format.js';
import { MOVE, isConfirm, isBack } from '../keys.js';
import { MAX_STARS } from '../../core/scoring.js';
import { TAGLINES, posterFor } from './posters.js';
import { step } from './lobby-nav.js';
import { isSide } from '../../core/difficulty.js';

function reel(level, best, start) {
  const b = best[level.id];
  const r = button(null, () => { play('select'); start(level); }, `reel${level.boss ? ' finale' : ''}${b ? ' played' : ''}`);
  r.dataset.id = level.id;
  r.append(h('span', 'reel-n', String(level.index)), starRow(b?.stars ?? 0), h('span', 'reel-best', b ? fmt(b.score) : '—'));
  r.setAttribute('aria-label', `${worldName(level)}, ${reelName(level).toLowerCase()}`);
  return r;
}

function poster(world, best, start) {
  const look = lookFor({ world: world.id });
  const art = h('div', 'poster-art');
  art.style.background = skyCss(look);
  const canvas = posterFor(world.id);
  if (canvas) art.append(canvas);
  art.append(
    h('span', 'poster-world', `World ${world.id}`),
    h('div', 'poster-type',
      h('h3', 'poster-name', world.name),
      h('p', 'poster-tag', TAGLINES[world.id - 1]),
      h('p', 'poster-bill', 'Featuring ', h('b', null, bossDef(world.boss).name))));
  const reels = LEVELS.filter((l) => l.world === world.id).map((l) => reel(l, best, start));
  const el = h('article', 'poster', art, h('div', 'reels', ...reels));
  el.style.setProperty('--accent', look.palette.accent);
  return { el, art, reels, world: world.id };
}

export function lobbyScreen({ best, start, back, focusId = 'w1-1' }) {
  const el = shell('lobby');
  const cols = WORLDS.map((w) => poster(w, best, start));
  const rows = [false, true].map((side) => cols.flatMap((c, i) => (isSide(c.world) === side ? [i] : [])))
    .filter((row) => row.length);
  const mid = (i) => {
    const r = cols[i].el.getBoundingClientRect();
    return r.left + r.width / 2;
  };
  const near = (w, row) => row.reduce((a, b) => (Math.abs(mid(b) - mid(w)) < Math.abs(mid(a) - mid(w)) ? b : a));
  const total = Object.values(best).reduce((n, b) => n + b.stars, 0);
  const backBtn = button('Back', () => { play('back'); back(); }, 'btn');
  el.append(
    h('header', 'marquee', h('span', 'bulbs'), h('h2', 'marquee-title', 'Now showing'), h('span', 'bulbs')),
    h('p', 'sub', `${WORLDS.length} worlds, ${LEVELS.length} reels. Every one is open. `, h('span', 'lobby-total', `★ ${total} / ${LEVELS.length * MAX_STARS}`)),
    h('div', 'posters', ...rows[0].map((i) => cols[i].el)),
    rows[1] && h('div', 'side', h('span', 'side-label', 'Also showing'), ...rows[1].map((i) => cols[i].el)),
    h('div', 'row', backBtn, h('span', 'hint', '← → world · ↑ ↓ reel · Enter play · Esc back')));
  const grid = cols.map((c) => c.reels);
  const first = grid.flat().find((r) => r.dataset.id === focusId) ?? grid[0][0];
  let lastReel = first;
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
      if (isBack(code)) return backBtn.click(), true;
      const at = where(document.activeElement);
      if (document.activeElement === backBtn) {
        if (MOVE[code]?.[1] < 0) focusItem(lastReel);
        else if (isConfirm(code)) backBtn.click();
        return true;
      }
      if (!at) return focusItem(lastReel), true;
      const move = MOVE[code];
      if (move) {
        lastReel = document.activeElement;
        const to = step(at, move, rows, grid[0].length, near);
        return focusItem(to ? grid[to[0]][to[1]] : backBtn), true;
      }
      if (isConfirm(code)) return document.activeElement.click(), true;
      return false;
    },
    update: developer(cols, posterFor), // a poster that has just been baked develops in
  };
}
