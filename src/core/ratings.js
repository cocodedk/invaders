// Each world's difficulty as a score out of 10, shown on its card in Level Select: half the world's own setting
// (the mean d of its five levels, difficulty.js) and half how often the lagged autopilot fails it (six reaction lags
// x 20 seeds per level, the way boss levels have to be measured: their seeds share an opening), as
// 1 + 9 x (d + fail) / 2, to one decimal. The lagged autopilot walks to where it decided to be at HAND (hand.js,
// 1800 px/s since R68), so the scores are relative to that model of a hand and move with it. Written by
// scripts/ratings.mjs; run it again when a world is added or retuned, as pars are.
export const RATINGS = [3.1, 3.1, 4.6, 4.2, 6.4, 6.6, 8.5, 8.0, 4.8, 3.9, 5.9, 6.5, 6.8, 6.9, 6.8, 6.8, 8.4, 8.6];

export const ratingOf = (world) => RATINGS[world - 1] ?? null;
