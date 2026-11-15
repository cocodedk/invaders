// World 19's parallax layers (registry; see parallax-shapes.js for the painter contract): bathtaps, the far layer (parallax-bath-taps.js),
// bathshelf, the middle one (-shelf) and bathfoam, the near one (-foam); what they share is parallax-bath-kit.js.
import { bathtaps } from './parallax-bath-taps.js';
import { bathshelf } from './parallax-bath-shelf.js';
import { bathfoam } from './parallax-bath-foam.js';

export const BATH = { bathtaps, bathshelf, bathfoam };
