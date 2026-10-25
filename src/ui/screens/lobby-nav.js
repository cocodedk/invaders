// Where the lobby's arrow keys go (DOM-free). The reels stand in one column per world, and the worlds
// in rows: the main run's, then the side worlds' (lobby.css).
//   step([world, reel], [dx, dy], rows, reels, near) -> [world, reel] | null   null: Back
//     rows  the world indices of each row, top to bottom
//     near  (world, row) -> the world in `row` nearest `world` on screen (the caller measures)
// Left and right change world within its row and keep the reel, wrapping. Up and down change reel;
// past a column's end they carry on into the nearest world of the row below (its first reel) or
// above (its last), and below the last row they leave for Back. Above the first row they stay on its
// first reel.
export function step([world, reel], [dx, dy], rows, reels, near) {
  const i = rows.findIndex((row) => row.includes(world));
  const row = rows[i];
  if (dx) return [row[(row.indexOf(world) + dx + row.length) % row.length], reel];
  if (reel + dy >= 0 && reel + dy < reels) return [world, reel + dy];
  const next = rows[i + dy];
  if (dy > 0) return next ? [near(world, next), 0] : null;
  return next ? [near(world, next), reels - 1] : [world, 0];
}
