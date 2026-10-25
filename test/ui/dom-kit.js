// Stand-ins for the DOM under node. Install one before importing the module under test (with
// `await import(...)` after it), since the module may reach for `document` as it loads.
//   sink               a canvas context that takes any call or read and returns itself (0 as a number)
//   recorder()         { ctx, calls }: a context that records every call it gets
//   installCanvas(n)   document.createElement gives an n x n canvas whose context is sink
//   element(tag)       a stand-in element that keeps what is appended to it
//   installElements()  document.createElement gives such elements
export const sink = new Proxy(() => sink, { get: (f, k) => (k === Symbol.toPrimitive ? () => 0 : sink), apply: () => sink });

// A context that records every call, handing back `sink` (so gradients chain), for counting what a
// painter or a flourish draws: calls is [[name, ...args]], a drawImage also with .alpha, the
// globalAlpha it was drawn at.
export function recorder() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : (...a) => {
      const call = [k, ...a];
      call.alpha = o.globalAlpha;
      calls.push(call);
      return sink;
    }),
    set: (o, k, v) => ((o[k] = v), true),
  });
  return { ctx, calls };
}

export function installCanvas(size = 1) {
  globalThis.document = {
    createElement: () => ({ width: size, height: size, getContext: () => sink }),
    addEventListener() {},
  };
}

export const element = (tag) => ({
  tag, className: '', children: [], textContent: '', style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  append(...kids) { this.children.push(...kids); },
  addEventListener() {}, setAttribute() {}, focus() {},
});

export function installElements() {
  globalThis.document = { createElement: element, addEventListener() {}, activeElement: null, hidden: false };
}
