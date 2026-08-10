// Script to create a proper 256x256 PNG icon for Dev Launcher
// Run with: node scripts/make-icon.mjs
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const SIZE = 256;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

const cx = SIZE / 2;
const cy = SIZE / 2;

// Background
ctx.fillStyle = '#181818';
ctx.fillRect(0, 0, SIZE, SIZE);

// Outer glow ring
ctx.strokeStyle = 'rgba(217,119,87,0.3)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(cx, cy, 108, 0, Math.PI * 2);
ctx.stroke();

// Inner circle
ctx.fillStyle = '#1f1f1f';
ctx.beginPath();
ctx.arc(cx, cy, 96, 0, Math.PI * 2);
ctx.fill();

// Glow
const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 96);
glow.addColorStop(0, 'rgba(217,119,87,0.08)');
glow.addColorStop(1, 'rgba(217,119,87,0)');
ctx.fillStyle = glow;
ctx.beginPath();
ctx.arc(cx, cy, 96, 0, Math.PI * 2);
ctx.fill();

// Terminal chevron >
ctx.strokeStyle = '#d97757';
ctx.lineWidth = 14;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(72, 88);
ctx.lineTo(108, 128);
ctx.lineTo(72, 168);
ctx.stroke();

// Cursor underline
ctx.fillStyle = 'rgba(217,119,87,0.9)';
ctx.beginPath();
ctx.roundRect(116, 156, 68, 12, 6);
ctx.fill();

// Three dots (traffic lights style at top)
const dotColors = ['rgba(217,119,87,0.7)', 'rgba(217,119,87,0.45)', 'rgba(217,119,87,0.2)'];
[116, 132, 148].forEach((x, i) => {
  ctx.fillStyle = dotColors[i];
  ctx.beginPath();
  ctx.arc(x, 72, 5, 0, Math.PI * 2);
  ctx.fill();
});

const buffer = canvas.toBuffer('image/png');
writeFileSync('public/app-icon.png', buffer);
console.log('Icon written to public/app-icon.png (' + buffer.length + ' bytes)');
