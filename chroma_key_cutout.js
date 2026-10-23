const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputJpg = 'C:\\Users\\Divin\\.gemini\\antigravity\\brain\\cad6abad-a15d-4496-a241-cd2581300de4\\blue_white_sneaker_chroma_green_1792756598093.jpg';
const destCutout = path.join(__dirname, 'public/assets/sneakers/sneaker_clean_cutout.png');
const destMidsole = path.join(__dirname, 'public/assets/sneakers/midsole_mask.png');
const assetCutout = path.join(__dirname, '../assets/sneaker_clean_cutout.png');

async function processChromaCutout() {
  console.log('Loading chroma key sneaker image...');
  const { data, info } = await sharp(inputJpg).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  const outBuf = Buffer.alloc(w * h * 4);
  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x);
      const r = data[idx * 3];
      const g = data[idx * 3 + 1];
      const b = data[idx * 3 + 2];

      // Green screen keying algorithm
      // Green background has high green and low red/blue
      const maxRB = Math.max(r, b);
      const greenDifference = g - maxRB;

      let alpha = 255;
      let finalG = g;

      // Pure green background
      if (greenDifference > 35 && g > 115) {
        alpha = 0;
      }
      // Edge transition / anti-aliasing
      else if (greenDifference > 10 && g > 95) {
        // Linear falloff from 10 to 35
        const t = (greenDifference - 10) / 25;
        alpha = Math.round(255 * (1 - t));
        // Green despill
        finalG = maxRB;
      } else {
        alpha = 255;
        // Minor despill for any bounce light on edges
        if (g > maxRB) {
          finalG = maxRB;
        }
      }

      outBuf[idx * 4] = r;
      outBuf[idx * 4 + 1] = finalG;
      outBuf[idx * 4 + 2] = b;
      outBuf[idx * 4 + 3] = alpha;

      if (alpha > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Detected Sneaker Bounding Box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
  const shoeWidth = maxX - minX + 1;
  const shoeHeight = maxY - minY + 1;
  console.log(`Sneaker dimensions: ${shoeWidth} x ${shoeHeight}, true aspect ratio: ${(shoeWidth / shoeHeight).toFixed(3)}`);

  // Crop with 20px padding around the sneaker
  const pad = 20;
  const cropLeft = Math.max(0, minX - pad);
  const cropTop = Math.max(0, minY - pad);
  const cropWidth = Math.min(w - cropLeft, shoeWidth + pad * 2);
  const cropHeight = Math.min(h - cropTop, shoeHeight + pad * 2);

  console.log(`Cropping to: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

  const croppedCutoutBuf = await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  fs.writeFileSync(destCutout, croppedCutoutBuf);
  fs.writeFileSync(assetCutout, croppedCutoutBuf);
  console.log(`Saved pristine sneaker cutout to: ${destCutout}`);

  // Inspect cropped cutout
  const cMeta = await sharp(croppedCutoutBuf).metadata();
  const cW = cMeta.width;
  const cH = cMeta.height;
  console.log(`Final cutout dimensions: ${cW} x ${cH}, aspect ratio: ${(cW / cH).toFixed(3)}`);

  // Generate Contoured Midsole Mask
  const { data: cData } = await sharp(croppedCutoutBuf).raw().toBuffer({ resolveWithObject: true });
  const maskBuf = Buffer.alloc(cW * cH * 4);

  let maskCount = 0;
  for (let y = 0; y < cH; y++) {
    const origY = y + cropTop;
    const relY = y / cH;

    for (let x = 0; x < cW; x++) {
      const idx = (y * cW + x) * 4;
      const a = cData[idx + 3];

      if (a > 40) {
        const r = cData[idx];
        const g = cData[idx + 1];
        const b = cData[idx + 2];

        // Midsole rubber is in the lower 25% of the shoe (relY 0.72 .. 0.94)
        // and has light rubber color (r > 190, g > 190, b > 190)
        const isMidsoleY = relY >= 0.72 && relY <= 0.94;
        const isWhiteRubber = r >= 180 && g >= 180 && b >= 180 && Math.abs(r - b) < 30;

        if (isMidsoleY && isWhiteRubber) {
          maskBuf[idx] = 235;     // R
          maskBuf[idx + 1] = 190; // G
          maskBuf[idx + 2] = 85;  // B
          maskBuf[idx + 3] = Math.round(a * 0.90);
          maskCount++;
        } else {
          maskBuf[idx + 3] = 0;
        }
      } else {
        maskBuf[idx + 3] = 0;
      }
    }
  }

  console.log(`Midsole mask pixels: ${maskCount}`);

  await sharp(maskBuf, { raw: { width: cW, height: cH, channels: 4 } })
    .blur(1.0)
    .png()
    .toFile(destMidsole);

  console.log(`Saved contoured midsole mask to: ${destMidsole}`);
  return { cW, cH, ratio: cW / cH };
}

processChromaCutout().catch(console.error);
