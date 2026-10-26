// Each level's par time in seconds (R66): twice what the autopilot takes to clear it when it is never
// hit, rounded up to 5 s. The round's speed multiplier is measured against it (scoring.js speedOf).
// scripts/pars.mjs writes this table; test/core/pars.test.js checks that it is current.
export const PARS = {
  'w1-1': 65, 'w1-2': 70, 'w1-3': 60, 'w1-4': 110, 'w1-5': 70,
  'w2-1': 40, 'w2-2': 60, 'w2-3': 90, 'w2-4': 70, 'w2-5': 110,
  'w3-1': 50, 'w3-2': 80, 'w3-3': 50, 'w3-4': 95, 'w3-5': 80,
  'w4-1': 55, 'w4-2': 120, 'w4-3': 115, 'w4-4': 150, 'w4-5': 85,
  'w5-1': 35, 'w5-2': 70, 'w5-3': 80, 'w5-4': 95, 'w5-5': 100,
  'w6-1': 40, 'w6-2': 60, 'w6-3': 75, 'w6-4': 70, 'w6-5': 70,
  'w7-1': 55, 'w7-2': 85, 'w7-3': 120, 'w7-4': 110, 'w7-5': 75,
  'w8-1': 35, 'w8-2': 70, 'w8-3': 60, 'w8-4': 120, 'w8-5': 100,
  'w9-1': 60, 'w9-2': 75, 'w9-3': 90, 'w9-4': 50, 'w9-5': 85,
  'w10-1': 45, 'w10-2': 75, 'w10-3': 75, 'w10-4': 55, 'w10-5': 80,
  'w11-1': 35, 'w11-2': 115, 'w11-3': 140, 'w11-4': 200, 'w11-5': 80,
  'w12-1': 55, 'w12-2': 50, 'w12-3': 70, 'w12-4': 85, 'w12-5': 110,
  'w13-1': 40, 'w13-2': 55, 'w13-3': 70, 'w13-4': 85, 'w13-5': 75,
  'w14-1': 45, 'w14-2': 70, 'w14-3': 50, 'w14-4': 90, 'w14-5': 120,
  'w15-1': 45, 'w15-2': 110, 'w15-3': 65, 'w15-4': 100, 'w15-5': 90,
  'w16-1': 40, 'w16-2': 100, 'w16-3': 70, 'w16-4': 115, 'w16-5': 70,
  'w17-1': 40, 'w17-2': 80, 'w17-3': 50, 'w17-4': 80, 'w17-5': 85,
  'w18-1': 65, 'w18-2': 60, 'w18-3': 65, 'w18-4': 90, 'w18-5': 85,
};
export const DEFAULT_PAR = 60; // s, for a level with no entry (the tests' own levels)
export const parOf = (level) => PARS[level.id] ?? DEFAULT_PAR;
