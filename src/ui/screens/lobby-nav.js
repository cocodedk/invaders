// Where the lobby's arrow keys go (DOM-free). Every world is a column of reels, and the worlds stand in
// rows of PER_ROW, in order, a partly filled last row left-aligned on the same columns (lobby.css).
//   rowsOf(count) -> [[world index, ...], ...]   the rows of the grid, top to bottom
//   step([world, reel], [dx, dy], rows, reels, goal) -> [world, reel] | null   null: the bottom bar
//     reels  how many reels a column holds: one number for all of them, or an array of counts by world index
//            (a one-leg world holds one reel)
// Left and right change world within its row and keep the reel, wrapping inside that row (a world with fewer
// reels takes the key's reel as its last). Up and down change reel; past a column's end they carry on into the
// row below (its first reel) or above (its last) at the goal column, or on that row's last card if it is shorter.
// The goal column is the one the pilot last chose (by left, right or the pointer; lobby.js remembers it, and it
// defaults to the current column), so a short last row does not lose it: down from world 12 to world 19 and up
// again is world 12, not 11.
// Below the last row the keys leave for the bar (Back, Reset scores); above the first row they stay on its first reel.
export const PER_ROW = 8;

export const rowsOf = (count) =>
  Array.from({ length: Math.ceil(count / PER_ROW) }, (_, r) =>
    Array.from({ length: Math.min(PER_ROW, count - r * PER_ROW) }, (_2, c) => r * PER_ROW + c));

export function step([world, reel], [dx, dy], rows, reels, goal) {
  const count = (w) => (Array.isArray(reels) ? reels[w] : reels);
  const r = rows.findIndex((row) => row.includes(world));
  const row = rows[r];
  const col = row.indexOf(world);
  if (dx) {
    const to = row[(col + dx + row.length) % row.length];
    return [to, Math.min(reel, count(to) - 1)];
  }
  if (reel + dy >= 0 && reel + dy < count(world)) return [world, reel + dy];
  const next = rows[r + dy];
  if (!next) return dy > 0 ? null : [world, 0];
  const to = next[Math.min(goal ?? col, next.length - 1)];
  return [to, dy > 0 ? 0 : count(to) - 1];
}
