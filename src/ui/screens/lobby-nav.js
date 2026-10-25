// Where the lobby's arrow keys go (DOM-free). The reels stand in one column per world and the worlds
// in rows of PER_ROW, the five columns of lobby.css .posters.
//   step([world, reel], [dx, dy], worlds, reels) -> [world, reel] | null   null: below the last row, Back
// Left and right change world within its row and keep the reel. Up and down change reel; past a
// column's end they carry on into the column of the row below (its first reel) or above (its last),
// and below the last row they leave for Back. Above the first row they stay on its first reel.
export const PER_ROW = 5;

export function step([world, reel], [dx, dy], worlds, reels) {
  if (dx) {
    const row = world - (world % PER_ROW);
    const n = Math.min(PER_ROW, worlds - row);
    return [row + ((world - row + dx + n) % n), reel];
  }
  if (reel + dy >= 0 && reel + dy < reels) return [world, reel + dy];
  const next = world + dy * PER_ROW;
  if (dy > 0) return next < worlds ? [next, 0] : null;
  return next >= 0 ? [next, reels - 1] : [world, 0];
}
