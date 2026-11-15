// What World 19's backdrop shares (sky-bodies-11.js, parallax-bath*.js, ambient-11.js, flourish-bath*.js): the maker's mark, the
// room's colours, the wall's tiles, where the window is, and the line below which the alien rows never hold. The look's value rule
// (looks/w19.js) holds for every colour painted above FLOOR: nothing pale stands behind the alien rows or the boss, so the wall, the
// window and the brass are mid-value there, and cream, butter and the foam's white are kept to the waterline. Nothing here is teal.
export const MAKER_MARK = 'Built with cc-fable-5.2 · 2026-11-15'; // the maker's brass plate on the tub (parallax-bath-foam.js)
export const FLOOR = 600; // formations.js keeps every slot inside y 0..600: the backdrop is mid-value above this line
export const TILE = 120; // a wall tile's side with its grout (toy scale: a tile is twice a duckling)
export const GROUT = 6;
export const TILES_TO = 700; // the glazed tile runs down to about here, then thins into the steam over the water
export const SHEEN_A = 0.12; // the most a tile's glaze sheen (PAL.wall.sheen, which is pale) is laid at
export const WINDOW = { x: 96, y: 118, w: 196, h: 258 }; // the sash window, small and high in the top-left corner, under the score's panel
export const SUN = { x: 252, y: 330, r: 150, a: 0.24 }; // the low sun, a blur behind the steamed lower panes: where, how wide, how strong

export const PAL = {
  wall: { grout: '#143e24', dark: '#164a2c', light: '#3f9a5c', crack: '#0e3418', sheen: '#9fdcae', steam: '#e4f0d8' },
  glass: '#6f9466', glassSun: '#9c9458', frame: '#8f8763', sun: '#ffe2a0',
  coral: '#d4644a', coralDark: '#a8402e', grout: '#6e3424', cream: '#f4e4c4', peach: '#f0b48a', ink: '#4a2418',
  brass: { dark: '#4a3008', body: '#8a6420', light: '#d8a840', spec: '#fff0b8' },
  enamel: { hi: '#fffaf0', mid: '#f1e7cf', lo: '#c8b78f', flank: '#e8d8b0' },
  water: { hi: '#e8f4dc', mid: '#b4d29a', lo: '#86b67c' },
  foam: { hi: '#fffdf6', mid: '#f3efe0', lo: '#cfc9b2' },
  bottle: { rose: '#e07a8e', amber: '#d8962e', mint: '#86c89a' },
  cork: '#c89a60', loofah: '#d8b070', wood: '#9a6434', red: '#d8402e', lamp: '#ffe07a',
};
