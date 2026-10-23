const sharp = require('sharp');

async function findLeak() {
  const { data, info } = await sharp('../assets/sneaker_clean.jpg').raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const visited = new Uint8Array(w * h);
  const queue = [];

  for (let x = 0; x < w; x++) {
    queue.push(x, 0); queue.push(x, h - 1);
    visited[x] = 1; visited[(h - 1) * w + x] = 1;
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y); queue.push(w - 1, y);
    visited[y * w] = 1; visited[y * w + (w - 1)] = 1;
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (!visited[nIdx]) {
          const nr = data[nIdx * 3], ng = data[nIdx * 3 + 1], nb = data[nIdx * 3 + 2];
          const isBg = nr > 232 && ng > 232 && nb > 232 && Math.abs(nr - ng) < 15 && Math.abs(ng - nb) < 15;
          if (isBg) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
            // Check if this pixel is inside the known shoe bounds
            if (nx > 400 && nx < 700 && ny > 300 && ny < 650) {
              console.log(`Leaked into shoe quarter at (${nx}, ${ny}), rgb(${nr},${ng},${nb})`);
              return;
            }
          }
        }
      }
    }
  }
}

findLeak().catch(console.error);
