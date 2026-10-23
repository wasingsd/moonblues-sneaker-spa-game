const sharp = require('sharp');
const path = require('path');

async function processCutoutAndMidsole() {
  const srcPath = '../assets/sneaker_clean.jpg';
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // 1. Identify Background vs Shoe
  // Background is neutral light studio gray/white around (247, 247, 247)
  // Let's create an exact boolean grid isShoe[y * w + x]
  const isShoe = new Uint8Array(w * h);

  // Scanning from left/right/top/bottom
  // Find top contour topY[x] and bottom contour botY[x]
  const topY = new Int32Array(w).fill(-1);
  const botY = new Int32Array(w).fill(-1);

  function isBgPixel(r, g, b, y) {
    // Top & sides background
    const diffR = Math.abs(r - 247);
    const diffG = Math.abs(g - 247);
    const diffB = Math.abs(b - 247);
    const maxSpread = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

    if (y < 680) {
      return diffR <= 12 && diffG <= 12 && diffB <= 12 && maxSpread <= 8;
    } else {
      // Bottom shadow region (y >= 680):
      // Blue outsole has b >= 75 and r <= 60 (b - r >= 25)
      // Shadow is grayish (b - r < 20, r > 150, g > 150)
      const isBlueOutsole = (b - r >= 25) && b >= 60;
      if (isBlueOutsole) return false;
      return (r >= 140 && g >= 140 && maxSpread <= 15);
    }
  }

  // Horizontal range of shoe
  const minX = 105;
  const maxX = 1118;

  for (let x = minX; x <= maxX; x++) {
    // Find top boundary
    for (let y = 140; y < 750; y++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (!isBgPixel(r, g, b, y)) {
        // Confirm with next pixel
        const nextIdx = ((y + 1) * w + x) * 3;
        if (!isBgPixel(data[nextIdx], data[nextIdx + 1], data[nextIdx + 2], y + 1)) {
          topY[x] = y;
          break;
        }
      }
    }

    // Find bottom boundary (scan upward from bottom)
    for (let y = 780; y >= 500; y--) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (!isBgPixel(r, g, b, y)) {
        botY[x] = y;
        break;
      }
    }
  }

  // Smooth contours slightly to remove single-pixel noise
  for (let x = minX + 1; x < maxX; x++) {
    if (topY[x] === -1 && topY[x - 1] !== -1 && topY[x + 1] !== -1) {
      topY[x] = Math.round((topY[x - 1] + topY[x + 1]) / 2);
    }
    if (botY[x] === -1 && botY[x - 1] !== -1 && botY[x + 1] !== -1) {
      botY[x] = Math.round((botY[x - 1] + botY[x + 1]) / 2);
    }
  }

  // Mark all pixels between topY and botY as shoe
  for (let x = minX; x <= maxX; x++) {
    const ty = topY[x];
    const by = botY[x];
    if (ty !== -1 && by !== -1 && by >= ty) {
      for (let y = ty; y <= by; y++) {
        isShoe[y * w + x] = 255;
      }
    }
  }

  // Build clean alpha cutout buffer with 1.5px anti-aliased edge smoothing
  const cutoutBuf = Buffer.alloc(w * h * 4);
  const midsoleMaskBuf = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const srcIdx = idx * 3;
      const dstIdx = idx * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      cutoutBuf[dstIdx] = r;
      cutoutBuf[dstIdx + 1] = g;
      cutoutBuf[dstIdx + 2] = b;

      if (isShoe[idx] === 255) {
        // Edge distance check for anti-aliasing
        let edgeDist = 2;
        if (x <= minX + 1 || x >= maxX - 1) edgeDist = 1;
        if (y <= topY[x] + 1 || y >= botY[x] - 1) edgeDist = 1;

        cutoutBuf[dstIdx + 3] = edgeDist === 1 ? 210 : 255;

        // Detect if this pixel is part of the white midsole
        // Midsole characteristics in AF1:
        // Y between 560 and 685 (above blue outsole, below upper leather)
        // Midsole color is near-white rubber: r,g,b > 200 with low saturation
        // Blue outsole below has b >= 75 and r <= 60
        // Upper leather above is either royal blue (b > 120, r < 60) or white quarter with stitch line
        const isMidsoleY = (y >= 570 && y <= 685);
        const isMidsoleColor = (r > 190 && g > 190 && b > 190 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20);
        const notOutsole = !(b - r > 35 && b > 80);

        if (isMidsoleY && isMidsoleColor && notOutsole) {
          midsoleMaskBuf[dstIdx] = 230;      // R: warm vintage yellow tint
          midsoleMaskBuf[dstIdx + 1] = 185;  // G
          midsoleMaskBuf[dstIdx + 2] = 85;   // B
          midsoleMaskBuf[dstIdx + 3] = 255;  // Alpha
        }
      } else {
        cutoutBuf[dstIdx + 3] = 0;
      }
    }
  }

  // Save clean sneaker cutout
  const cleanCutoutPath = 'public/assets/sneakers/sneaker_clean_cutout.png';
  await sharp(cutoutBuf, { raw: { width: w, height: h, channels: 4 } })
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(cleanCutoutPath);
  console.log('Saved crystal-clear sneaker cutout to:', cleanCutoutPath);

  // Save midsole mask (feathered slightly for smooth blending)
  const midsoleMaskPath = 'public/assets/sneakers/midsole_mask.png';
  await sharp(midsoleMaskBuf, { raw: { width: w, height: h, channels: 4 } })
    .blur(1.2)
    .png()
    .toFile(midsoleMaskPath);
  console.log('Saved midsole mask to:', midsoleMaskPath);
}

processCutoutAndMidsole().catch(console.error);
