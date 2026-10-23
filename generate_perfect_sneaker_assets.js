const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputJpg = 'C:\\Users\\Divin\\.gemini\\antigravity\\brain\\cad6abad-a15d-4496-a241-cd2581300de4\\blue_white_sneaker_lateral_profile_1792755258804.jpg';
const destCutout = path.join(__dirname, 'public/assets/sneakers/sneaker_clean_cutout.png');
const destMidsole = path.join(__dirname, 'public/assets/sneakers/midsole_mask.png');
const assetCutout = path.join(__dirname, '../assets/sneaker_clean_cutout.png');

async function main() {
  console.log('Loading raw image...');
  const { data, info } = await sharp(inputJpg).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Flood fill from outer boundaries
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

          // Background condition:
          // Near white studio background
          const isWhiteBg = (r >= 222 && g >= 222 && b >= 222) &&
                            Math.abs(r - g) <= 12 &&
                            Math.abs(g - b) <= 12;

          // Grey contact shadow under the sole
          const isShadow = (cy >= 670) && (r >= 170 && g >= 170 && b >= 170) &&
                           Math.abs(r - g) <= 10 && Math.abs(g - b) <= 10;

          if (isWhiteBg || isShadow) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Find exact bounding box of the sneaker (foreground)
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

  console.log(`Sneaker Bounding Box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
  console.log(`True Sneaker Size: width=${maxX - minX + 1}, height=${maxY - minY + 1}`);

  // Create RGBA buffer with edge anti-aliasing
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

  // 1-pixel soft anti-aliasing on borders to blend smoothly with dark boutique background
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!visited[idx]) {
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

  // Crop with 24px uniform padding around the sneaker
  const pad = 24;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(w - cropLeft, (maxX - minX + 1) + pad * 2);
  const cropHeight = Math.min(h - cropTop, (maxY - minY + 1) + pad * 2);

  console.log(`Cropping cutout: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

  const croppedCutoutBuf = await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  fs.writeFileSync(destCutout, croppedCutoutBuf);
  fs.writeFileSync(assetCutout, croppedCutoutBuf);
  console.log(`Successfully saved pristine sneaker cutout to: ${destCutout}`);

  // Now generate Midsole Mask specifically contoured for this new cropped sneaker!
  // Midsole coordinates relative to the cropped sneaker:
  // In the original image:
  // Sole bottom is at Y=672, Midsole starts around Y=595 to 610
  // Left: X ~ 260, Right: X ~ 1160
  const cropMeta = await sharp(croppedCutoutBuf).metadata();
  const cW = cropMeta.width;
  const cH = cropMeta.height;
  console.log(`Final cutout dimensions: ${cW} x ${cH}, aspect ratio: ${(cW / cH).toFixed(3)}`);

  const { data: cData } = await sharp(croppedCutoutBuf).raw().toBuffer({ resolveWithObject: true });
  const maskBuf = Buffer.alloc(cW * cH * 4);

  // We detect the midsole rubber:
  // It's in the lower portion of the shoe: Y relative > 0.70 and < 0.95
  // And it is white/light-colored rubber:
  for (let y = 0; y < cH; y++) {
    const origY = y + cropTop;
    for (let x = 0; x < cW; x++) {
      const origX = x + cropLeft;
      const idx = (y * cW + x) * 4;
      const a = cData[idx + 3];

      if (a > 30) {
        const r = cData[idx];
        const g = cData[idx + 1];
        const b = cData[idx + 2];

        // Midsole region is between origY 590 and 665
        const isMidsoleY = origY >= 590 && origY <= 665;
        // Midsole is white/light grey rubber:
        const isWhiteRubber = r >= 195 && g >= 195 && b >= 195 && Math.abs(r - g) <= 20;

        if (isMidsoleY && isWhiteRubber) {
          // Yellow vintage aged tint
          maskBuf[idx] = 235;     // R (vintage yellow-amber)
          maskBuf[idx + 1] = 190; // G
          maskBuf[idx + 2] = 85;  // B
          maskBuf[idx + 3] = Math.round(a * 0.90); // Alpha
        } else {
          maskBuf[idx + 3] = 0;
        }
      } else {
        maskBuf[idx + 3] = 0;
      }
    }
  }

  // Slight blur on the midsole mask for natural organic diffusion
  await sharp(maskBuf, { raw: { width: cW, height: cH, channels: 4 } })
    .blur(1.2)
    .png()
    .toFile(destMidsole);

  console.log(`Successfully generated contoured midsole mask at: ${destMidsole}`);
}

main().catch(console.error);
