// Where the lobby's arrow keys go (DOM-free). The reels stand in one column per world, and the worlds
// in rows: the main run's, then the side worlds' (lobby.css).
//   step([world, reel], [dx, dy], rows, reels) -> [world, reel] | null   null: Back
//     rows  the world indices of each row, top to bottom
// Left and right change world within its row and keep the reel, wrapping. Up and down change reel;
// past a column's end they carry on into the row below (its first reel) or above (its last), and below
// the last row they leave for Back. Above the first row they stay on its first reel.
// They land on the same place in the next row, or on its last card if that is shorter. The rows are
// centred on one pitch (lobby.css), so when one has a card more or less than the other every card stands
// half a card off the one above or below it and two cards tie for nearest; the one at the same place
// wins, so down and then up comes back to where you were.
export function step([world, reel], [dx, dy], rows, reels) {
  const i = rows.findIndex((row) => row.includes(world));
  const row = rows[i];
  if (dx) return [row[(row.indexOf(world) + dx + row.length) % row.length], reel];
  if (reel + dy >= 0 && reel + dy < reels) return [world, reel + dy];
  const next = rows[i + dy];
  if (!next) return dy > 0 ? null : [world, 0];
  return [next[Math.min(row.indexOf(world), next.length - 1)], dy > 0 ? 0 : reels - 1];
}
