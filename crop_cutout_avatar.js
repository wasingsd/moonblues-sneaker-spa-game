const sharp = require('sharp');

async function cropCutoutAvatar() {
  const src = '../assets/nong_blue_mascot_cutout.png';

  // Extract the exact same 520x520 crop from the transparent cutout
  await sharp(src)
    .extract({ left: 188, top: 60, width: 520, height: 520 })
    .resize(512, 512, { kernel: 'lanczos3' })
    .png({ quality: 100 })
    .toFile('public/assets/mascot/nong_blue_avatar.png');

  console.log('Saved transparent 512x512 portrait to public/assets/mascot/nong_blue_avatar.png');
}

cropCutoutAvatar().catch(console.error);
