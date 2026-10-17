// Auto quality. The game's loop hands sampleFrame the measured WORK time of every frame (core steps
// + fx + draw, performance.now() around them) and the rAF interval it ran in. Once a second (of
// intervals) both averages are judged:
//   drop to 0.5 (half the particle spawns via fx.density, no glow on the far parallax layer) when the
//     work averages above DROP_MS, or the interval above INTERVAL_DROP_MS (ruling R23: a GPU-bound Pi
//     shows in the display's pace, not in the CPU work measured here);
//   restore to 1 only when the work is below RESTORE_MS AND the interval below INTERVAL_RESTORE_MS;
//   in between hold, so a frame cost sitting near one line never flickers.
// The interval alone is no measure of the work: a 60 Hz display pins it at 16.7 ms whatever the
// frame costs. A 30 Hz display sits at half quality (accepted cost of R23). Pure: no clock of its own.
//   q = createQuality() -> { level, avg, interval, sum, isum, n, span }
//   level 1 | 0.5; avg and interval: the last window's mean work and mean interval (ms)

export const DROP_MS = 20;
export const RESTORE_MS = 14;
export const INTERVAL_DROP_MS = 22;
export const INTERVAL_RESTORE_MS = 18;
const WINDOW_MS = 1000;
const STALL_MS = 250; // a longer frame is a hidden tab or a pause, not the renderer: skip it

export const createQuality = () => ({ level: 1, avg: 0, interval: 0, sum: 0, isum: 0, n: 0, span: 0 });

// ms: this frame's work; interval: the time since the last frame (defaults to ms).
export function sampleFrame(q, ms, interval = ms) {
  if (!(ms >= 0) || ms > STALL_MS || !(interval >= 0) || interval > STALL_MS) return q.level;
  q.sum += ms;
  q.isum += interval;
  q.n += 1;
  q.span += Math.max(ms, interval);
  if (q.span < WINDOW_MS) return q.level;
  q.avg = q.sum / q.n;
  q.interval = q.isum / q.n;
  if (q.avg > DROP_MS || q.interval > INTERVAL_DROP_MS) q.level = 0.5;
  else if (q.avg < RESTORE_MS && q.interval < INTERVAL_RESTORE_MS) q.level = 1;
  q.sum = 0;
  q.isum = 0;
  q.n = 0;
  q.span = 0;
  return q.level;
}
