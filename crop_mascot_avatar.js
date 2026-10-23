const sharp = require('sharp');

async function createMascotAvatar() {
  const src = '../assets/nong_blue_mascot.jpg';
  
  // Crop 520x520 square around head, ears, and hoodie chest
  const cropped = await sharp(src)
    .extract({ left: 188, top: 60, width: 520, height: 520 })
    .toBuffer();

  // Save as high-res avatar jpg
  await sharp(cropped)
    .resize(512, 512, { kernel: 'lanczos3' })
    .jpeg({ quality: 95 })
    .toFile('public/assets/mascot/nong_blue_avatar.jpg');

  // Also create a transparent cutout version with circle/rounded mask
  // Let's do an alpha cutout of the head/bust
  console.log('Saved 512x512 portrait to public/assets/mascot/nong_blue_avatar.jpg');
}

createMascotAvatar().catch(console.error);
