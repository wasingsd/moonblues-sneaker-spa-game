const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputJpg = 'C:\\Users\\Divin\\.gemini\\antigravity\\brain\\cad6abad-a15d-4496-a241-cd2581300de4\\blue_white_sneaker_lateral_profile_1792755258804.jpg';
const outCutoutPng = path.join(__dirname, 'public/assets/sneakers/sneaker_clean_cutout.png');
const outMidsoleMask = path.join(__dirname, 'public/assets/sneakers/midsole_mask.png');

async function processSneaker() {
  const { data, info } = await sharp(inputJpg).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  console.log(`Input image: ${w}x${h}`);

  // Sample background color from the four corners and borders
  let bgR = 0, bgG = 0, bgB = 0, count = 0;
  for (let x = 0; x < w; x += 10) {
    for (const y of [5, 10, h - 10, h - 5]) {
      const idx = (y * w + x) * 3;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      count++;
    }
  }
  for (let y = 0; y < h; y += 10) {
    for (const x of [5, 10, w - 10, w - 5]) {
      const idx = (y * w + x) * 3;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
      count++;
    }
  }
  bgR /= count;
  bgG /= count;
  bgB /= count;
  console.log(`Average background color: RGB(${bgR.toFixed(1)}, ${bgG.toFixed(1)}, ${bgB.toFixed(1)})`);

  // Flood fill from outer boundaries
  // We use color distance from background
  const visited = new Uint8Array(w * h);
  const queue = [];

  // Seed borders
  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
    visited[x] = 1;
    visited[(h - 1) * w + x] = 1;
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
    visited[y * w] = 1;
    visited[y * w + (w - 1)] = 1;
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (!visited[nIdx]) {
          const r = data[nIdx * 3];
          const g = data[nIdx * 3 + 1];
          const b = data[nIdx * 3 + 2];

          // Check if this pixel is background
          // Pure studio white background: very bright (r, g, b > 238) and low saturation
          const isWhiteBg = (r >= 238 && g >= 238 && b >= 238) && 
                            Math.abs(r - g) <= 8 && 
                            Math.abs(g - b) <= 8;

          // Also check for very faint cast shadow right under the sole if at bottom of canvas
          const isShadow = (cy > h * 0.72) && (r >= 210 && g >= 210 && b >= 210) && 
                           Math.abs(r - g) <= 6 && Math.abs(g - b) <= 6;

          if (isWhiteBg || isShadow) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Find bounding box of remaining foreground (the sneaker)
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!visited[idx]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Detected Sneaker Bounding Box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
  console.log(`Sneaker dimensions: ${maxX - minX + 1} x ${maxY - minY + 1}, aspect ratio: ${((maxX - minX + 1) / (maxY - minY + 1)).toFixed(3)}`);

  // Create transparent cutout buffer
  const outBuf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    outBuf[i * 4] = r;
    outBuf[i * 4 + 1] = g;
    outBuf[i * 4 + 2] = b;

    if (visited[i]) {
      outBuf[i * 4 + 3] = 0;
    } else {
      outBuf[i * 4 + 3] = 255;
    }
  }

  // Anti-alias edges: smooth alpha of boundary pixels
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!visited[idx]) {
        // check if any neighbor is visited
        let bgNeighbors = 0;
        if (visited[idx - 1]) bgNeighbors++;
        if (visited[idx + 1]) bgNeighbors++;
        if (visited[idx - w]) bgNeighbors++;
        if (visited[idx + w]) bgNeighbors++;
        if (bgNeighbors > 0) {
          outBuf[idx * 4 + 3] = Math.round(255 * (1 - bgNeighbors * 0.18));
        }
      }
    }
  }

  // Crop to sneaker with 30px padding on all sides
  const pad = 30;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(w - cropLeft, (maxX - minX + 1) + pad * 2);
  const cropHeight = Math.min(h - cropTop, (maxY - minY + 1) + pad * 2);

  console.log(`Cropping to: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

  const croppedCutout = await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  fs.writeFileSync(outCutoutPng, croppedCutout);
  console.log(`Saved pristine sneaker cutout to: ${outCutoutPng}`);

  // Also save a copy to Phase4_MBS_ZeroPartyData/assets/sneaker_clean_cutout.png
  const assetCutout = path.join(__dirname, '../assets/sneaker_clean_cutout.png');
  fs.writeFileSync(assetCutout, croppedCutout);

  // Now generate matching midsole mask for this cropped sneaker!
  // Midsole in a lateral profile sits on the bottom layer:
  // Let's inspect the cropped cutout to find the exact vertical range of the midsole rubber
  const croppedMeta = await sharp(croppedCutout).metadata();
  console.log(`Cropped cutout size: ${croppedMeta.width} x ${croppedMeta.height}, ratio: ${(croppedMeta.width / croppedMeta.height).toFixed(3)}`);

  return { cropWidth, cropHeight, minX: minX - cropLeft, maxX: maxX - cropLeft, minY: minY - cropTop, maxY: maxY - cropTop };
}

processSneaker().catch(console.error);
