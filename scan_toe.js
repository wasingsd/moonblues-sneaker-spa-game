const sharp = require('sharp');
const imgPath = 'C:\\Users\\Divin\\.gemini\\antigravity\\brain\\cad6abad-a15d-4496-a241-cd2581300de4\\blue_white_sneaker_lateral_profile_1792755258804.jpg';

async function scanToe() {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;

  console.log('--- Inspecting Toe Boundary (X = 1150 to 1190) ---');
  for (let x = 1150; x <= 1190; x += 5) {
    let nonBg = 0;
    for (let y = 480; y <= 680; y++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // Studio background is off-white (r>230, g>230, b>230, low saturation)
      const isBg = (r > 225 && g > 225 && b > 225 && Math.abs(r-g) < 12 && Math.abs(g-b) < 12);
      if (!isBg) nonBg++;
    }
    console.log(`X=${x} : nonBg pixels = ${nonBg}`);
  }

  console.log('--- Inspecting Heel Boundary (X = 210 to 250) ---');
  for (let x = 210; x <= 250; x += 5) {
    let nonBg = 0;
    for (let y = 200; y <= 680; y++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const isBg = (r > 225 && g > 225 && b > 225 && Math.abs(r-g) < 12 && Math.abs(g-b) < 12);
      if (!isBg) nonBg++;
    }
    console.log(`X=${x} : nonBg pixels = ${nonBg}`);
  }
}

scanToe().catch(console.error);
