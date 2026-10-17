// Level select as a cinema lobby: eight posters (each world's boss fight, rendered by the game) over
// five reels each, showing best stars and best score. Every reel is open from the start.
// Keys: left/right change world (same reel), up/down change reel, down from the last reel reaches
// Back, Enter plays, Esc goes back. The mouse focuses on hover and plays on click.
//   lobbyScreen({ best, start(level), back(), focusId }) -> screen   best: storage allBest()
// Posters not baked yet show their sky and develop in, one a frame (update), focused world first.
import { LEVELS, WORLDS } from '../../core/levels.js';
import { bossDef } from '../../core/bosses-data.js';
import { lookFor } from '../looks/index.js';
import { play } from '../audio.js';
import { h, button, focusItem, shell, starRow } from './dom.js';
import { TAGLINES, posterFor, bakePoster } from './posters.js';

const fmt = (n) => n.toLocaleString('en-US');
const skyCss = (look) => `linear-gradient(180deg, ${look.sky.map(([s, c]) => `${c} ${s * 100}%`).join(', ')})`;

function reel(level, best, start) {
  const b = best[level.id];
  const r = button(null, () => { play('select'); start(level); }, `reel${level.boss ? ' finale' : ''}${b ? ' played' : ''}`);
  r.dataset.id = level.id;
  r.append(h('span', 'reel-n', String(level.index)), starRow(b?.stars ?? 0), h('span', 'reel-best', b ? fmt(b.score) : '—'));
  r.setAttribute('aria-label', `${WORLDS[level.world - 1].name}, ${level.boss ? 'finale' : `reel ${level.index}`}`);
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
  const total = Object.values(best).reduce((n, b) => n + b.stars, 0);
  const backBtn = button('Back', () => { play('back'); back(); }, 'btn');
  el.append(
    h('header', 'marquee', h('span', 'bulbs'), h('h2', 'marquee-title', 'Now showing'), h('span', 'bulbs')),
    h('p', 'sub', `${WORLDS.length} worlds, ${LEVELS.length} reels. Every one is open. `, h('span', 'lobby-total', `★ ${total} / ${LEVELS.length * 3}`)),
    h('div', 'posters', ...cols.map((c) => c.el)),
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
  const home = cols.find((c) => c.reels.includes(first));
  const queue = [home, ...cols.filter((c) => c !== home)]; // the focused world develops first
  return {
    el, focus: first,
    onKey(code) {
      if (code === 'Escape' || code === 'Backspace') return backBtn.click(), true;
      const at = where(document.activeElement);
      if (document.activeElement === backBtn) {
        if (code === 'ArrowUp' || code === 'KeyW') focusItem(lastReel);
        else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') backBtn.click();
        return true;
      }
      if (!at) return focusItem(lastReel), true;
      const [w, r] = at;
      const move = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0], ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] }[code];
      if (move) {
        lastReel = document.activeElement;
        if (r + move[1] >= grid[0].length) return focusItem(backBtn), true;
        focusItem(grid[(w + move[0] + grid.length) % grid.length][Math.max(0, r + move[1])]);
        return true;
      }
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') return document.activeElement.click(), true;
      return false;
    },
    update() { // develop one missing poster a frame
      const next = queue.find((c) => !c.art.querySelector('canvas'));
      if (!next) return;
      const canvas = bakePoster(next.world);
      next.art.prepend(canvas);
      next.art.classList.add('develop');
    },
  };
}
