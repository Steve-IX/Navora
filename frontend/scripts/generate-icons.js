// Generate PWA icons - simple map pin design
import sharp from 'sharp';

async function generateIcon(size, outputPath) {
  // Create an SVG with a simple map pin icon
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pinGrad${size}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow${size}">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="${size}" height="${size}" fill="#f3f4f6" rx="${size * 0.15}"/>
      <!-- Map pin shape -->
      <path d="M ${size * 0.5} ${size * 0.2} 
               C ${size * 0.5} ${size * 0.15} ${size * 0.65} ${size * 0.15} ${size * 0.65} ${size * 0.35}
               C ${size * 0.65} ${size * 0.45} ${size * 0.5} ${size * 0.65} ${size * 0.5} ${size * 0.65}
               C ${size * 0.5} ${size * 0.65} ${size * 0.35} ${size * 0.45} ${size * 0.35} ${size * 0.35}
               C ${size * 0.35} ${size * 0.15} ${size * 0.5} ${size * 0.15} ${size * 0.5} ${size * 0.2} Z"
            fill="url(#pinGrad${size})"
            filter="url(#shadow${size})"/>
      <!-- Pin center circle -->
      <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.12}" fill="white" opacity="0.9"/>
      <circle cx="${size * 0.5}" cy="${size * 0.4}" r="${size * 0.08}" fill="#3b82f6"/>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .resize(size, size)
    .toFile(outputPath);
  
  console.log(`Generated ${outputPath} (${size}x${size})`);
}

async function main() {
  try {
    await generateIcon(192, './public/icon-192.png');
    await generateIcon(512, './public/icon-512.png');
    console.log('✓ Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();

