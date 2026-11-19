// The near shore of Golden Isle (the owner's cast, 2026-11-19), on the left of the near layer (parallax-isle-sea.js): a dark rocky
// headland where the monkey host masses to cross, ranks of warriors carrying boulders toward the causeway, spearmen, banners and a war
// drum among them, and at its tip, at the head of the host, the hero's brother with his great bow, looking out to the island. The rock
// and the boulders are painted like the cast (isle-paint.js): lit warm toward the low sun, violet underneath, a warm rim on their tops. Everything stands where
// SHORE says, the same on every level.
import { lin, shade, mix, rgba } from './sprites.js';
import { shape, paint, lit, line, toward, PAINT } from './isle-paint.js';
import { profile } from './parallax-kit.js';
import { warrior, standard, wardrum, HOST } from './isle-host.js';
import { archer } from './isle-archer.js';

// In the frame with the ship at the middle: the headland's top [x, y] points left to right (it meets the swell at its last), the
// archer's feet and height, the host's far rank and near rank [x, y, pose, height] and the banners and drum [x, y, height].
export const SHORE = {
  edge: [[-160, 924], [-60, 916], [40, 926], [140, 918], [240, 930], [330, 938], [420, 950], [480, 972], [520, 1000]],
  archer: [418, 952, 188],
  ranks: [[[-130, 930, 'stand', 74], [-84, 936, 'carry', 70], [-36, 926, 'shoulder', 76], [14, 936, 'carry', 74], [62, 928, 'stand', 74], [110, 938, 'shoulder', 78], [160, 930, 'carry', 76], [208, 940, 'shoulder', 78], [256, 944, 'carry', 78], [310, 950, 'heave', 76]],
    [[-150, 980, 'shoulder', 92], [-96, 990, 'carry', 96], [-40, 984, 'stand', 94], [16, 994, 'shoulder', 98], [72, 986, 'carry', 96], [130, 996, 'stand', 98], [186, 990, 'shoulder', 100], [244, 1000, 'carry', 98], [302, 1004, 'shoulder', 100]]],
  banners: [[100, 930, 200], [262, 944, 188]],
  drum: [176, 936, 100],
  rocks: [[-140, 1040, 40], [-20, 1050, 34], [120, 1046, 44], [260, 1052, 36], [380, 1010, 30], [40, 960, 22], [200, 966, 20]], // boulders the host has gathered: [x, y, size]
  rock: '#2a1c24', // the headland's rock
  stone: mix('#3c3644', '#a08460', 0.3), // a boulder's body
};
const U = toward(-0.1); // the low sun, up and to the right of the headland
const KS = [1, 0.86, 0.96, 0.8, 1, 0.9, 0.84, 0.98]; // a boulder's roughness round its rim

// A boulder r wide on (x, y): a rough stone lit warm toward the sun and violet underneath, a flat top facet catching the light and a
// crack across its face. The sea's floating stones are the same (parallax-isle-sea.js).
export function boulder(g, x, y, r) {
  shape(g, KS.map((k, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * (Math.sin(a) < 0 ? 0.78 : 0.5) * k];
  }));
  paint(g, lit(g, SHORE.stone, x, y, r, U), 1.2);
  shape(g, [[x - r * 0.62, y - r * 0.36], [x - r * 0.12, y - r * 0.7], [x + r * 0.5, y - r * 0.56], [x + r * 0.42, y - r * 0.22], [x - r * 0.18, y - r * 0.14]]);
  paint(g, lit(g, mix(SHORE.stone, PAINT.sun, 0.3), x, y - r * 0.4, r * 0.6, U), 0);
  line(g, [[x - r * 0.18, y - r * 0.14], [x - r * 0.05, y + r * 0.2], [x + r * 0.12, y + r * 0.3]], rgba(PAINT.night, 0.6), Math.max(1, r * 0.04));
  line(g, [[x - r * 0.5, y - r * 0.5], [x + r * 0.1, y - r * 0.72], [x + r * 0.62, y - r * 0.5]], rgba(PAINT.rim, 0.5), Math.max(1, r * 0.05));
}

// A headland of rock along the points pts: its top edge caught warm by the low sun.
function rock(g, pts, h, top, end) {
  g.fillStyle = lin(g, 0, pts[0][1], 0, h, [[0, SHORE.rock], [1, shade(SHORE.rock, -0.5)]]);
  profile(g, end, h, top);
  g.strokeStyle = rgba(PAINT.rim, 0.35);
  g.lineWidth = 2;
  g.beginPath();
  for (const [x, y] of pts) g.lineTo(x, y + 1);
  g.stroke();
}


const between = (pts, x, wave) => { // the height of the edge pts at x, rough
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [[x0, y0], [x1, y1]] = [pts[i - 1], pts[i]];
    return x < x0 ? null : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) + wave * Math.sin(x * 0.13);
  }
  return null;
};

export function shore(g, h, X, Y) {
  const pts = SHORE.edge.map(([x, y]) => [X(x), Y(y)]);
  rock(g, pts, h, (x) => between(pts, x, 3) ?? h + 10, pts[pts.length - 1][0]);
  for (const [x, y, r] of SHORE.rocks) boulder(g, X(x), Y(y), r);
  for (const [x, y, t] of SHORE.banners) standard(g, X(x), Y(y), t);
  const [far, near] = SHORE.ranks;
  for (const [x, y, pose, t] of far) warrior(g, pose, X(x), Y(y), t);
  wardrum(g, X(SHORE.drum[0]), Y(SHORE.drum[1]), SHORE.drum[2]);
  const [ax, ay, at] = SHORE.archer;
  archer(g, X(ax), Y(ay), at, HOST.light);
  for (const [x, y, pose, t] of near) warrior(g, pose, X(x), Y(y), t); // in front of him
}
