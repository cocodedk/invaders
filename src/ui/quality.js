// Auto quality. The game's loop hands every frame's time to sampleFrame; once a second the average
// is judged: above DROP_MS the level falls to 0.5 (half the particle spawns via fx.density, no glow
// on the far parallax layer), below RESTORE_MS it comes back to 1, and in between it holds, so a
// frame rate sitting near one line never flickers between the two. Pure: no clock of its own.
//   q = createQuality() -> { level, avg, sum, n }    level 1 | 0.5, avg the last window's mean (ms)

export const DROP_MS = 20;
export const RESTORE_MS = 14;
const WINDOW_MS = 1000;
const STALL_MS = 250; // a longer frame is a hidden tab or a pause, not the renderer: skip it

export const createQuality = () => ({ level: 1, avg: 0, sum: 0, n: 0 });

export function sampleFrame(q, ms) {
  if (!(ms > 0) || ms > STALL_MS) return q.level;
  q.sum += ms;
  q.n += 1;
  if (q.sum < WINDOW_MS) return q.level;
  q.avg = q.sum / q.n;
  if (q.avg > DROP_MS) q.level = 0.5;
  else if (q.avg < RESTORE_MS) q.level = 1;
  q.sum = 0;
  q.n = 0;
  return q.level;
}
