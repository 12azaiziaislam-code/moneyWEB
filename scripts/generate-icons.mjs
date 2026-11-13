/**
 * Generates the PWA icons (PNG) from maths — zero dependencies.
 * Source of truth for the artwork is this file; `public/icons/icon.svg` mirrors it.
 *
 *   node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public', 'icons');

/* ------------------------------- PNG encoder ------------------------------ */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------- artwork -------------------------------- */
const lerp = (a, b, t) => a + (b - a) * t;

function insideRoundedSquare(u, v, radius) {
  const x = Math.min(u, 1 - u);
  const y = Math.min(v, 1 - v);
  if (x >= radius || y >= radius) return true;
  return Math.hypot(radius - x, radius - y) <= radius;
}

function starPoints(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.42;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function colorAt(u, v, { maskable }) {
  if (!maskable && !insideRoundedSquare(u, v, 0.225)) return [0, 0, 0, 0];

  // Deep emerald diagonal gradient (#0f766e -> #064e3b).
  const t = Math.min(1, Math.max(0, (u * 0.6 + v * 0.8) / 1.4));
  let r = lerp(15, 6, t);
  let g = lerp(118, 78, t);
  let b = lerp(110, 59, t);

  // Soft light from the top-left.
  const glow = Math.max(0, 0.55 - Math.hypot(u - 0.24, v - 0.2));
  r = lerp(r, 52, glow * 0.55);
  g = lerp(g, 199, glow * 0.55);
  b = lerp(b, 163, glow * 0.55);

  const s = maskable ? 0.62 : 0.82;
  const cx = 0.5;
  const cy = 0.5;

  const inMain = Math.hypot(u - cx, v - cy) <= 0.335 * s;
  const inCut = Math.hypot(u - (cx + 0.145 * s), v - (cy - 0.055 * s)) <= 0.295 * s;
  const inCrescent = inMain && !inCut;
  const inStar = insidePolygon(u, v, starPoints(cx + 0.215 * s, cy - 0.235 * s, 0.105 * s));

  if (inCrescent || inStar) {
    // Warm ivory logo with a subtle gold tint on the edge.
    const edge = Math.min(
      Math.abs(Math.hypot(u - cx, v - cy) - 0.335 * s),
      Math.abs(Math.hypot(u - (cx + 0.145 * s), v - (cy - 0.055 * s)) - 0.295 * s),
    );
    const gold = edge < 0.02 ? 0.25 : 0;
    return [lerp(255, 201, gold), lerp(255, 162, gold), lerp(255, 39, gold), 255];
  }
  return [r, g, b, 255];
}

function render(size, options) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 3;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const [cr, cg, cb, ca] = colorAt((x + (sx + 0.5) / samples) / size, (y + (sy + 0.5) / samples) / size, options);
          r += cr * (ca / 255);
          g += cg * (ca / 255);
          b += cb * (ca / 255);
          a += ca;
        }
      }
      const count = samples * samples;
      const alpha = a / count;
      const index = (y * size + x) * 4;
      rgba[index] = Math.round(alpha > 0 ? r / count / (alpha / 255 || 1) : 0);
      rgba[index + 1] = Math.round(alpha > 0 ? g / count / (alpha / 255 || 1) : 0);
      rgba[index + 2] = Math.round(alpha > 0 ? b / count / (alpha / 255 || 1) : 0);
      rgba[index + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180.png', size: 180, maskable: true },
  { file: 'favicon-32.png', size: 32, maskable: false },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const target of targets) {
  const png = render(target.size, { maskable: target.maskable });
  const path = join(OUT_DIR, target.file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  console.log(`✓ ${target.file} (${target.size}px, ${(png.length / 1024).toFixed(1)} KB)`);
}
