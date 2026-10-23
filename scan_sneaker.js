const sharp = require('sharp');

const imgPath = 'C:\\Users\\Divin\\.gemini\\antigravity\\brain\\cad6abad-a15d-4496-a241-cd2581300de4\\blue_white_sneaker_lateral_profile_1792755258804.jpg';

async function scan() {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  for (let x = 50; x <= 1350; x += 50) {
    let topY = -1, botY = -1;
    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const isShoe = (b > r + 15) || (r < 190 && g < 190 && b < 190);
      if (isShoe) {
        if (topY === -1) topY = y;
        botY = y;
      }
    }
    console.log(`X=${x} : topY=${topY}, botY=${botY}`);
  }
}

scan().catch(console.error);
