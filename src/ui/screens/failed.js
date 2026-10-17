// A failed level: SHOT DOWN, how far the run got, and Retry / Select.
//   failedScreen({ label, score, progress }, { retry, select }) -> screen
import { h, button, navigate, shell, armed } from './dom.js';

export function failedScreen(o, act) {
  const ready = armed();
  const go = (fn) => () => ready() && fn();
  const el = shell('results dim lost');
  const items = [button('Retry', go(act.retry), 'btn btn-big'), button(act.selectLabel ?? 'Select', go(act.select), 'btn btn-big')];
  el.append(
    h('div', 'banner',
      h('p', 'banner-kicker', o.label),
      h('h2', 'banner-title', 'Shot down'),
      h('p', 'result-line', h('span', 'result-cap', 'Score'), h('span', 'result-score', o.score.toLocaleString('en-US'))),
      h('p', 'result-best', o.progress)),
    h('nav', 'menu menu-row', ...items));
  return { el, focus: items[0], onKey: (code) => !ready() || navigate(items, code) };
}
