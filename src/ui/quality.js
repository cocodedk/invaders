// Auto quality. The game's loop hands sampleFrame the measured WORK time of every frame (core steps
// + fx + draw, performance.now() around them) and the rAF interval it ran in. Not the interval alone:
// a 60 Hz display pins that at 16.7 ms, which never falls below the restore line. Once a second (of
// intervals) the average work is judged: above DROP_MS the level falls to 0.5 (half the particle spawns
// via fx.density, no glow on the far parallax layer), below RESTORE_MS it comes back to 1, and in
// between it holds, so a frame cost sitting near one line never flickers. Pure: no clock of its own.
//   q = createQuality() -> { level, avg, sum, n, span }   level 1 | 0.5, avg the last window's mean work

export const DROP_MS = 20;
export const RESTORE_MS = 14;
const WINDOW_MS = 1000;
const STALL_MS = 250; // a longer frame is a hidden tab or a pause, not the renderer: skip it

export const createQuality = () => ({ level: 1, avg: 0, sum: 0, n: 0, span: 0 });

// ms: this frame's work; interval: the time since the last frame (defaults to ms).
export function sampleFrame(q, ms, interval = ms) {
  if (!(ms >= 0) || ms > STALL_MS || !(interval >= 0) || interval > STALL_MS) return q.level;
  q.sum += ms;
  q.n += 1;
  q.span += Math.max(ms, interval);
  if (q.span < WINDOW_MS) return q.level;
  q.avg = q.sum / q.n;
  if (q.avg > DROP_MS) q.level = 0.5;
  else if (q.avg < RESTORE_MS) q.level = 1;
  q.sum = 0;
  q.n = 0;
  q.span = 0;
  return q.level;
}
