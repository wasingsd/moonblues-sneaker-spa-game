const sharp = require('sharp');
const path = require('path');

const srcPath = 'c:/Users/Divin/.antigravity/Jorng/Phase4_MBS_ZeroPartyData/assets/sneaker_clean.jpg';
const outPath = 'c:/Users/Divin/.antigravity/Jorng/Phase4_MBS_ZeroPartyData/moonblues-sneaker-spa-game/public/assets/sneakers/sneaker_clean_cutout.png';

async function floodFillCutout() {
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  const queue = [];

  // Add outer border pixels to queue
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

  // BFS flood fill
  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const idx = (cy * w + cx) * 3;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // Check neighbors
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
          const nr = data[nIdx * 3];
          const ng = data[nIdx * 3 + 1];
          const nb = data[nIdx * 3 + 2];
          // Studio background is off-white/light gray (r,g,b > 235 and low saturation)
          const isBg = nr > 232 && ng > 232 && nb > 232 && Math.abs(nr - ng) < 15 && Math.abs(ng - nb) < 15;
          if (isBg) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  // Create RGBA buffer
  const outBuf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    outBuf[i * 4] = r;
    outBuf[i * 4 + 1] = g;
    outBuf[i * 4 + 2] = b;

    if (visited[i]) {
      outBuf[i * 4 + 3] = 0; // Transparent background
    } else {
      outBuf[i * 4 + 3] = 255;
    }
  }

  await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(outPath);

  console.log('Saved sneaker cutout to:', outPath);
}

floodFillCutout().catch(console.error);
