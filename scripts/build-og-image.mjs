// Renders the social card (og:image, twitter:image) from its SVG source.
// Run `npm run og:image` after changing src/assets/og-image.svg, and commit the PNG.
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(new URL('../src/assets/og-image.svg', import.meta.url));
const target = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

const info = await sharp(source, { density: 144 })
	.resize(1200, 630)
	.png({ compressionLevel: 9 })
	.toFile(target);

console.log(`Wrote ${target} (${info.width}x${info.height}, ${info.size} bytes).`);
