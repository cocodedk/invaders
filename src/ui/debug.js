// ?debug: a corner readout of the average frame time and the auto-quality level, for measuring on
// the Pi. createDebug() is null without ?debug; sample(ms, quality) once per frame.
const WINDOW = 30; // frames averaged per readout

export function createDebug() {
  if (!new URLSearchParams(location.search).has('debug')) return null;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;bottom:10px;padding:6px 12px;border-radius:8px;'
    + 'background:rgba(8,10,18,0.8);color:#c8ffe0;font:700 16px ui-monospace,monospace;z-index:9;pointer-events:none';
  box.textContent = 'frame …';
  document.body.append(box);
  let n = 0;
  let sum = 0;
  return {
    sample(ms, quality) {
      sum += ms;
      if (++n < WINDOW) return;
      const f = sum / n;
      const q = quality.level === 1 ? 'full' : 'half';
      box.textContent = `frame ${f.toFixed(1)} ms (${(1000 / f).toFixed(0)} fps) · quality ${quality.level} ${q} · 1 s avg ${quality.avg.toFixed(1)} ms`;
      n = 0;
      sum = 0;
    },
  };
}
