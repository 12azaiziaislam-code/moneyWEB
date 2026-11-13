/**
 * Generates PWA & browser icons using sharp from the sovereign SVG emblem.
 * Source of truth: `public/icons/icon.svg`.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SVG_PATH = join(process.cwd(), 'public', 'icons', 'icon.svg');
const OUT_DIR = join(process.cwd(), 'public', 'icons');

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon-180.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
];

async function generate() {
  const svg = readFileSync(SVG_PATH);
  mkdirSync(OUT_DIR, { recursive: true });

  for (const target of targets) {
    const outPath = join(OUT_DIR, target.file);
    const pngBuffer = await sharp(svg)
      .resize(target.size, target.size, { fit: 'contain' })
      .png({ compressionLevel: 9 })
      .toBuffer();

    writeFileSync(outPath, pngBuffer);
    console.log(`✓ ${target.file} (${target.size}x${target.size}px, ${(pngBuffer.length / 1024).toFixed(1)} KB)`);
  }
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
