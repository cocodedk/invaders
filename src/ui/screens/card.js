// The title card while a level's art bakes: a film's opening card in the world's sky colours,
// "WORLD 2 · REEL 1", the world's name and its poster line.
import { h, shell } from './dom.js';
import { WORLDS } from '../../core/levels.js';
import { lookFor } from '../looks/index.js';
import { TAGLINES, reelName } from './posters.js';

export function cardScreen(level, kicker) {
  const look = lookFor(level);
  const el = shell('card');
  el.style.background = `linear-gradient(180deg, ${look.sky.map(([s, c]) => `${c} ${s * 100}%`).join(', ')})`;
  el.style.setProperty('--accent', look.palette.accent);
  const world = WORLDS[level.world - 1];
  el.append(h('div', 'card-body',
    h('p', 'card-kicker', kicker ?? `World ${level.world} · ${reelName(level)}`),
    h('h2', 'card-name', world.name),
    h('p', 'card-line', TAGLINES[level.world - 1] ?? ''),
    h('div', 'card-bar', h('span'))));
  return { el, onKey: () => true };
}
