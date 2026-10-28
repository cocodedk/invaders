// A DOM stand-in for the screens that need focus, clicks and removal (the lobby and its confirm card),
// richer than dom-kit.js's element(). Install it before importing the module under test.
//   installDom()  document.createElement gives elements that keep their children, classes, dataset and
//                 click and pointerenter listeners; click() and hover() run them, focus() makes the element document.activeElement,
//                 remove() takes it out of its parent
//                 scrollIntoView(opts) and scrollTo(opts) record themselves in el.scrolled ({ via: 'into' | 'to', ...opts });
//                 emit(type, event) runs the listeners of an event (the event object goes to each); scrollTop, clientHeight,
//                 offsetTop and offsetHeight are plain numbers; style.props holds the custom properties set with setProperty
//   all(el)       the element and every element beneath it
//   textOf(el)    the text beneath it, strings joined
import { sink } from './dom-kit.js';

function make(tag) {
  if (tag === 'canvas') return { width: 1, height: 1, getContext: () => sink, style: {} };
  const classes = new Set();
  const on = {};
  const el = {
    tag, children: [], parent: null, dataset: {}, attrs: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v; } }, isConnected: true, offsetWidth: 0,
    scrollTop: 0, clientHeight: 0, offsetTop: 0, offsetHeight: 0, scrolled: [],
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    get className() { return [...classes].join(' '); },
    set className(v) { classes.clear(); for (const c of v.split(/\s+/).filter(Boolean)) classes.add(c); },
    append(...kids) {
      for (const k of kids) if (typeof k === 'object') k.parent = el;
      el.children.push(...kids);
    },
    remove() {
      el.parent?.children.splice(el.parent.children.indexOf(el), 1);
      el.parent = null;
    },
    addEventListener(type, fn) { (on[type] ??= []).push(fn); },
    click() { for (const fn of on.click ?? []) fn(); },
    hover() { for (const fn of on.pointerenter ?? []) fn(); },
    emit(type, event = {}) { for (const fn of on[type] ?? []) fn(event); },
    scrollIntoView(opts) { el.scrolled.push({ via: 'into', ...opts }); },
    scrollTo(opts) { el.scrolled.push({ via: 'to', ...opts }); },
    focus() { globalThis.document.activeElement = el; },
    setAttribute(k, v) { el.attrs[k] = v; },
    querySelector: () => null,
  };
  return el;
}

export function installDom() {
  globalThis.document = { createElement: make, addEventListener() {}, activeElement: null, hidden: false };
}

export const all = (el) => [el, ...el.children.filter((k) => typeof k === 'object').flatMap(all)];
export const textOf = (el) => el.children.map((k) => (typeof k === 'object' ? textOf(k) : k)).join('');

export const has = (e, cls) => e.className.split(' ').includes(cls);

// The lobby under test, with its parts by name. lobbyScreen is imported by the test, after installDom(). The log
// records each start, back and reset the lobby called, in order.
//   openLobby(lobbyScreen, focusId, best) -> { screen, log, named(cls), reels (by id), page, backBtn, resetBtn, rows, cards,
//                                              card(world), key(...codes), at() (the focused reel's id), move(el) }
// move(el) is a pointer that moved over el (a real hover); move(el, 0, 0) one that did not (the page scrolled under it).
export function openLobby(lobbyScreen, focusId, best = {}) {
  const log = [];
  const screen = lobbyScreen({ best, start: (l) => log.push(`start ${l.id}`), back: () => log.push('back'), reset: () => log.push('reset'), focusId });
  const named = (cls) => all(screen.el).filter((e) => has(e, cls));
  const reels = Object.fromEntries(named('reel').map((r) => [r.dataset.id, r]));
  const [page] = named('lobby-scroll');
  const [backBtn, resetBtn] = named('lobby-bar')[0].children;
  return {
    screen, log, named, reels, page, backBtn, resetBtn, rows: named('posters'), cards: named('poster'),
    card: (world) => named('poster').find((c) => c.dataset.world === String(world)),
    key: (...codes) => codes.map((c) => screen.onKey(c)),
    at: () => document.activeElement.dataset?.id ?? document.activeElement,
    move: (el, dx = 3, dy = 0) => el.emit('pointermove', { movementX: dx, movementY: dy }),
  };
}
