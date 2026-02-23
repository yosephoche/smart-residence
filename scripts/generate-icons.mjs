/**
 * PWA Icon Generator
 * Generates all required PWA icons from an SVG source using sharp.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// SVG icon: house on blue-600 background
const houseSvg = (size, padding = 0.2) => {
  const bg = '#2563EB';
  const fg = '#FFFFFF';
  const p = size * padding;
  const inner = size - p * 2;

  // House shape (proportional)
  const cx = size / 2;
  const cy = size / 2;

  // Roof peak
  const roofTop = cy - inner * 0.30;
  // Roof base
  const roofBase = cy - inner * 0.02;
  // Wall bottom
  const wallBottom = cy + inner * 0.30;
  // Wall width
  const wallHalf = inner * 0.26;
  // Door
  const doorW = inner * 0.13;
  const doorH = inner * 0.18;
  const doorTop = wallBottom - doorH;

  const strokeW = Math.max(1, size * 0.02);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}" rx="${size * 0.18}"/>
  <!-- House body -->
  <rect x="${cx - wallHalf}" y="${roofBase}" width="${wallHalf * 2}" height="${wallBottom - roofBase}" fill="${fg}" opacity="0.95"/>
  <!-- Roof -->
  <polygon points="${cx},${roofTop} ${cx - wallHalf - size*0.04},${roofBase} ${cx + wallHalf + size*0.04},${roofBase}" fill="${fg}"/>
  <!-- Door -->
  <rect x="${cx - doorW/2}" y="${doorTop}" width="${doorW}" height="${doorH}" fill="${bg}" rx="${doorW * 0.2}"/>
</svg>`;
};

// Maskable icon has extra padding (safe zone ~20% on each side)
const maskableHouseSvg = (size) => {
  const bg = '#2563EB';
  const fg = '#FFFFFF';
  // Larger padding for maskable (safe zone)
  const p = size * 0.28;
  const inner = size - p * 2;

  const cx = size / 2;
  const cy = size / 2;

  const roofTop = cy - inner * 0.30;
  const roofBase = cy - inner * 0.02;
  const wallBottom = cy + inner * 0.30;
  const wallHalf = inner * 0.26;
  const doorW = inner * 0.13;
  const doorH = inner * 0.18;
  const doorTop = wallBottom - doorH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <!-- House body -->
  <rect x="${cx - wallHalf}" y="${roofBase}" width="${wallHalf * 2}" height="${wallBottom - roofBase}" fill="${fg}" opacity="0.95"/>
  <!-- Roof -->
  <polygon points="${cx},${roofTop} ${cx - wallHalf - size*0.04},${roofBase} ${cx + wallHalf + size*0.04},${roofBase}" fill="${fg}"/>
  <!-- Door -->
  <rect x="${cx - doorW/2}" y="${doorTop}" width="${doorW}" height="${doorH}" fill="${bg}" rx="${doorW * 0.2}"/>
</svg>`;
};

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#2563EB" rx="6"/>
  <polygon points="16,7 6,15 26,15" fill="white"/>
  <rect x="9" y="15" width="14" height="10" fill="white" opacity="0.95"/>
  <rect x="13" y="19" width="6" height="6" fill="#2563EB" rx="1"/>
</svg>`;

async function generate() {
  const iconsDir = resolve(root, 'public/icons');
  mkdirSync(iconsDir, { recursive: true });

  const icons = [
    { name: 'icon-192.png', size: 192, svg: houseSvg(192) },
    { name: 'icon-512.png', size: 512, svg: houseSvg(512) },
    { name: 'icon-maskable-512.png', size: 512, svg: maskableHouseSvg(512) },
    { name: 'apple-touch-icon.png', size: 180, svg: houseSvg(180) },
  ];

  for (const icon of icons) {
    await sharp(Buffer.from(icon.svg))
      .resize(icon.size, icon.size)
      .png()
      .toFile(resolve(iconsDir, icon.name));
    console.log(`✓ Generated ${icon.name}`);
  }

  // favicon.ico (32x32 PNG saved as .ico — browsers accept PNG data in .ico)
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(resolve(root, 'public/favicon.ico'));
  console.log('✓ Generated favicon.ico');

  console.log('\nAll PWA icons generated successfully!');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
