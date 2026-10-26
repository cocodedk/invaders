// A DOM stand-in for the screens that need focus, clicks and removal (the lobby and its confirm card),
// richer than dom-kit.js's element(). Install it before importing the module under test.
//   installDom()  document.createElement gives elements that keep their children, classes, dataset and
//                 click and pointerenter listeners; click() and hover() run them, focus() makes the element document.activeElement,
//                 remove() takes it out of its parent
//   all(el)       the element and every element beneath it
//   textOf(el)    the text beneath it, strings joined
import { sink } from './dom-kit.js';

function make(tag) {
  if (tag === 'canvas') return { width: 1, height: 1, getContext: () => sink, style: {} };
  const classes = new Set();
  const on = {};
  const el = {
    tag, children: [], parent: null, dataset: {}, attrs: {}, style: { setProperty() {} }, isConnected: true, offsetWidth: 0,
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
