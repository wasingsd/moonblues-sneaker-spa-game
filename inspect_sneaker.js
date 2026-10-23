const sharp = require('sharp');

async function inspect() {
  const { data, info } = await sharp('public/assets/sneakers/sneaker_clean_cutout.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log('--- Inspecting X=600 vertical slice ---');
  for (let y = 450; y <= 720; y += 15) {
    const idx = (y * 1200 + 600) * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
    console.log(`y=${y} (norm=${(y/896).toFixed(3)}): rgb(${r},${g},${b}) a=${a}`);
  }

  console.log('--- Inspecting X=800 vertical slice (front toe/sole) ---');
  for (let y = 450; y <= 720; y += 15) {
    const idx = (y * 1200 + 800) * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
    console.log(`y=${y} (norm=${(y/896).toFixed(3)}): rgb(${r},${g},${b}) a=${a}`);
  }

  console.log('--- Inspecting X=300 vertical slice (heel/sole) ---');
  for (let y = 450; y <= 720; y += 15) {
    const idx = (y * 1200 + 300) * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
    console.log(`y=${y} (norm=${(y/896).toFixed(3)}): rgb(${r},${g},${b}) a=${a}`);
  }
}

inspect().catch(console.error);
