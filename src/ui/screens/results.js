// The end of a cleared level: the kicker (world and reel), CLEARED, the stars stamping in one by
// one, the score counting up, the best (or NEW BEST), and Next / Retry / Select.
//   resultsScreen({ label, title, score, stars, best, newBest }, { next?, retry, select }) -> screen
// The buttons wait a moment (armed) so fire-button mashing at the clear cannot skip the card.
import { h, button, navigate, shell, starRow, armed } from './dom.js';
import { play } from '../audio.js';

const COUNT_TIME = 1.1; // s the score takes to count up
const STAR_AT = [0.55, 0.85, 1.15]; // s each star stamps in

const fmt = (n) => Math.round(n).toLocaleString('en-US');

export function resultsScreen(o, act) {
  const ready = armed();
  const go = (fn) => () => ready() && fn();
  const el = shell('results dim won');
  const stars = starRow(o.stars, 'stars stars-big');
  const score = h('span', 'result-score', '0');
  const best = o.newBest
    ? h('p', 'result-best new', 'New best!')
    : h('p', 'result-best', `Best ${fmt(o.best.score)}`);
  const items = [];
  if (act.next) items.push(button(act.nextLabel ?? 'Next', go(act.next), 'btn btn-big'));
  items.push(button(act.retryLabel ?? 'Retry', go(act.retry), 'btn btn-big'));
  items.push(button(act.selectLabel ?? 'Select', go(act.select), 'btn btn-big'));
  el.append(
    h('div', 'banner',
      h('p', 'banner-kicker', o.label),
      h('h2', 'banner-title', o.title ?? 'Cleared'),
      stars,
      h('p', 'result-line', h('span', 'result-cap', 'Score'), score),
      best),
    h('nav', 'menu menu-row', ...items));
  let t = 0;
  let stamped = 0;
  return {
    el, focus: items[0],
    onKey: (code) => !ready() || navigate(items, code),
    update(dt) {
      if (t > COUNT_TIME + 2) return;
      t += dt;
      const k = Math.min(1, t / COUNT_TIME);
      score.textContent = fmt(o.score * (1 - (1 - k) ** 3));
      if (k < 1) play('count');
      while (stamped < o.stars && t >= STAR_AT[stamped]) {
        stamped += 1;
        stars.children[stamped - 1].classList.add('stamp');
        play('star', { n: stamped });
      }
      if (o.newBest && t >= COUNT_TIME && !best.classList.contains('shown')) {
        best.classList.add('shown');
        play('best');
      }
    },
  };
}
