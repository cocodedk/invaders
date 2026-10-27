// Each level's par time in seconds (R66): twice what the autopilot takes to clear it when it is never
// hit, rounded up to 5 s. The round's speed multiplier is measured against it (scoring.js speedOf).
// scripts/pars.mjs writes this table; test/core/pars.test.js checks that it is current.
export const PARS = {
  'w1-1': 45, 'w1-2': 75, 'w1-3': 80, 'w1-4': 95, 'w1-5': 105,
  'w2-1': 40, 'w2-2': 55, 'w2-3': 75, 'w2-4': 75, 'w2-5': 65,
  'w3-1': 35, 'w3-2': 95, 'w3-3': 50, 'w3-4': 90, 'w3-5': 75,
  'w4-1': 35, 'w4-2': 85, 'w4-3': 90, 'w4-4': 120, 'w4-5': 80,
  'w5-1': 30, 'w5-2': 60, 'w5-3': 65, 'w5-4': 90, 'w5-5': 75,
  'w6-1': 45, 'w6-2': 60, 'w6-3': 80, 'w6-4': 65, 'w6-5': 85,
  'w7-1': 60, 'w7-2': 70, 'w7-3': 95, 'w7-4': 90, 'w7-5': 75,
  'w8-1': 30, 'w8-2': 65, 'w8-3': 55, 'w8-4': 90, 'w8-5': 85,
  'w9-1': 50, 'w9-2': 95, 'w9-3': 35, 'w9-4': 45, 'w9-5': 85,
  'w10-1': 45, 'w10-2': 65, 'w10-3': 55, 'w10-4': 55, 'w10-5': 95,
  'w11-1': 40, 'w11-2': 60, 'w11-3': 95, 'w11-4': 105, 'w11-5': 75,
  'w12-1': 45, 'w12-2': 75, 'w12-3': 70, 'w12-4': 70, 'w12-5': 105,
  'w13-1': 35, 'w13-2': 60, 'w13-3': 55, 'w13-4': 80, 'w13-5': 65,
  'w14-1': 40, 'w14-2': 65, 'w14-3': 60, 'w14-4': 90, 'w14-5': 90,
  'w15-1': 40, 'w15-2': 120, 'w15-3': 65, 'w15-4': 65, 'w15-5': 75,
  'w16-1': 50, 'w16-2': 100, 'w16-3': 80, 'w16-4': 90, 'w16-5': 95,
  'w17-1': 45, 'w17-2': 80, 'w17-3': 65, 'w17-4': 90, 'w17-5': 75,
  'w18-1': 50, 'w18-2': 55, 'w18-3': 45, 'w18-4': 85, 'w18-5': 75,
};
export const DEFAULT_PAR = 60; // s, for a level with no entry (the tests' own levels)
export const parOf = (level) => PARS[level.id] ?? DEFAULT_PAR;
