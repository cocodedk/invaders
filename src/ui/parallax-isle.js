// World 21's parallax layers (registry; see parallax-shapes.js for the painter contract): islecity, the far layer
// (parallax-isle-city.js), islecauseway, the middle one (-causeway) and islesea, the near one (-sea), which carries the maker's mark.
import { islecity } from './parallax-isle-city.js';
import { islecauseway } from './parallax-isle-causeway.js';
import { islesea } from './parallax-isle-sea.js';

export const ISLE_LAYERS = { islecity, islecauseway, islesea };
