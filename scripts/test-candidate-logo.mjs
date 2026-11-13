import sharp from 'sharp';
import fs from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#161B26" />
      <stop offset="50%" stop-color="#0E121A" />
      <stop offset="100%" stop-color="#07090D" />
    </linearGradient>
    <linearGradient id="gold-grad" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#FFF5C6" />
      <stop offset="25%" stop-color="#F3D17A" />
      <stop offset="60%" stop-color="#C99831" />
      <stop offset="100%" stop-color="#8F6215" />
    </linearGradient>
    <radialGradient id="inner-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#D4AF37" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Luxury Obsidian Squircle Base -->
  <rect width="512" height="512" rx="116" fill="url(#bg-grad)" />
  <rect x="12" y="12" width="488" height="488" rx="104" fill="none" stroke="url(#gold-grad)" stroke-width="4.5" stroke-opacity="0.45" />

  <g transform="translate(256, 256)">
    <!-- Radial Ambient Halo -->
    <circle r="190" fill="url(#inner-glow)" stroke="url(#gold-grad)" stroke-width="3" stroke-opacity="0.25" />

    <!-- Sacred 8-Pointed Star (Rub el Hizb) - Clean, bold, architectural -->
    <rect x="-124" y="-124" width="248" height="248" rx="28" fill="none" stroke="url(#gold-grad)" stroke-width="16" stroke-linejoin="round" />
    <rect x="-124" y="-124" width="248" height="248" rx="28" fill="none" stroke="url(#gold-grad)" stroke-width="16" stroke-linejoin="round" transform="rotate(45)" />

    <!-- Inner Core Medallion Ring -->
    <circle r="82" fill="#0A0D13" stroke="url(#gold-grad)" stroke-width="9" />

    <!-- Sculpted Golden Crescent -->
    <path
      d="M14 -44 C-18 -36 -36 -8 -30 24 C-24 52 4 70 36 62 C10 63 -16 44 -20 18 C-24 -8 -4 -34 20 -43 C18 -43.6 16 -43.8 14 -44 Z"
      fill="url(#gold-grad)"
    />

    <!-- Radiant Celestial Star in the Crescent's Heart -->
    <g transform="translate(22, -14)">
      <path
        d="M0 -22 Q2 -6 18 0 Q2 6 0 22 Q-2 6 -18 0 Q-2 -6 0 -22 Z"
        fill="url(#gold-grad)"
      />
      <circle r="3.5" fill="#FFF9D8" />
    </g>
  </g>
</svg>`;

fs.writeFileSync('tests/candidate-logo.svg', svg);
await sharp(Buffer.from(svg)).resize(40, 40).png().toFile('tests/candidate-logo-40.png');
await sharp(Buffer.from(svg)).resize(24, 24).png().toFile('tests/candidate-logo-24.png');
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('tests/candidate-logo-180.png');
console.log('Candidate renders created successfully!');

