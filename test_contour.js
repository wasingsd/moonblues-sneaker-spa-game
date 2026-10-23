const sharp = require('sharp');

async function testContour() {
  const { data, info } = await sharp('../assets/sneaker_clean.jpg').raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Background color is approximately (247, 247, 247)
  // Let's compute color distance from studio background (247, 247, 247)
  // A pixel is background if color difference is very small.
  function isStudioBg(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return true;
    const idx = (y * w + x) * 3;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    
    // Check if near neutral white studio background
    const diffR = Math.abs(r - 247);
    const diffG = Math.abs(g - 247);
    const diffB = Math.abs(b - 247);
    const spread = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    
    // Tabletop shadow at bottom (y > 700): has slight gray shading r,g,b in 220..245
    // But the shoe outsole at bottom is DEEP BLUE (r < 40, b > 90) or white midsole!
    return diffR < 12 && diffG < 12 && diffB < 12 && spread < 8;
  }

  // Find left and right bounds of the shoe
  let minX = 0, maxX = w - 1;
  // Scan from left
  for (let x = 0; x < w; x++) {
    let nonBg = 0;
    for (let y = 150; y < 750; y++) {
      if (!isStudioBg(x, y)) nonBg++;
    }
    if (nonBg > 10) { minX = x; break; }
  }

  // Scan from right
  for (let x = w - 1; x >= 0; x--) {
    let nonBg = 0;
    for (let y = 150; y < 750; y++) {
      if (!isStudioBg(x, y)) nonBg++;
    }
    if (nonBg > 10) { maxX = x; break; }
  }

  console.log(`Shoe horizontal span: minX=${minX}, maxX=${maxX}`);

  // Trace top contour topY[x]
  const topY = new Int32Array(w);
  for (let x = minX; x <= maxX; x++) {
    topY[x] = -1;
    for (let y = 100; y < 750; y++) {
      // Look for first clear non-background pixel
      if (!isStudioBg(x, y)) {
        // Verify with next 2 pixels to avoid single noise
        if (!isStudioBg(x, y + 1)) {
          topY[x] = y;
          break;
        }
      }
    }
  }

  // Trace bottom contour botY[x] (scanning from bottom y=895 upward)
  // Below the shoe is shadow. Shadow is gray/white (r > 190, g > 190, b > 190).
  // The shoe sole is either royal blue outsole (r < 50, b > 80) or white midsole edge.
  const botY = new Int32Array(w);
  for (let x = minX; x <= maxX; x++) {
    botY[x] = -1;
    for (let y = 780; y >= 500; y--) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      // Blue outsole is r < 70, b > 80
      // Outsole shadow transition:
      if (b - r > 30 || r < 140 || g < 140) {
        botY[x] = y;
        break;
      }
    }
  }

  console.log(`Sample top contour:`);
  for (let x = minX; x <= maxX; x += 100) {
    console.log(`x=${x}: topY=${topY[x]}, botY=${botY[x]}`);
  }
}

testContour().catch(console.error);
