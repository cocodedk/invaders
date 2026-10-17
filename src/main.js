// Placeholder boot: paints world 1's sky. Replaced by the real loop and screen routing later.
import { WORLDS } from './core/levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
sky.addColorStop(0, '#02030c');
sky.addColorStop(0.6, '#0a0a2a');
sky.addColorStop(1, '#241046');
ctx.fillStyle = sky;
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = '#9fffd0';
ctx.font = '72px system-ui, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(WORLDS[0].name, canvas.width / 2, canvas.height / 2);
