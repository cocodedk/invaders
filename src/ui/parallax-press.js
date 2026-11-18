// World 20's parallax layers (registry; see parallax-shapes.js for the painter contract): presstowers, the far layer
// (parallax-press-towers.js), presslines, the middle one (-lines) and pressfloor, the near one (-floor), which carries the colophon.
import { presstowers } from './parallax-press-towers.js';
import { presslines } from './parallax-press-lines.js';
import { pressfloor } from './parallax-press-floor.js';

export const PRESS = { presstowers, presslines, pressfloor };
