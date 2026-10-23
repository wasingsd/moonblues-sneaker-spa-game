const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = 'c:/Users/Divin/.antigravity/Jorng/Phase4_MBS_ZeroPartyData/moonblues-sneaker-spa-game/public/assets/sneakers';

async function main() {
  console.log('Processing decals and midsole texture...');

  // 1. Process Mud Splatters
  const mudSrc = 'C:/Users/Divin/.gemini/antigravity/brain/cad6abad-a15d-4496-a241-cd2581300de4/sneaker_mud_splatter_decals_1792731437624.jpg';
  const mudRaw = await sharp(mudSrc).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = mudRaw;

  // Helper to extract a crop and convert white to transparent alpha
  async function extractDecal(left, top, width, height, outName) {
    const cropped = await sharp(mudSrc)
      .extract({ left, top, width, height })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cData = cropped.data;
    const cWidth = cropped.info.width;
    const cHeight = cropped.info.height;
    const outBuffer = Buffer.alloc(cWidth * cHeight * 4);

    for (let i = 0; i < cWidth * cHeight; i++) {
      const r = cData[i * 3];
      const g = cData[i * 3 + 1];
      const b = cData[i * 3 + 2];

      // Calculate brightness (0 to 255)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      let alpha = 255;
      
      // If brightness is close to white (background), fade to transparent
      if (brightness > 220) {
        alpha = Math.max(0, Math.min(255, Math.round((255 - brightness) / 35 * 255)));
      }

      outBuffer[i * 4] = r;
      outBuffer[i * 4 + 1] = g;
      outBuffer[i * 4 + 2] = b;
      outBuffer[i * 4 + 3] = alpha;
    }

    const outPath = path.join(publicDir, outName);
    await sharp(outBuffer, {
      raw: {
        width: cWidth,
        height: cHeight,
        channels: 4,
      },
    })
      .png()
      .toFile(outPath);

    console.log(`Saved decal: ${outName} (${cWidth}x${cHeight})`);
  }

  // Extract 6 diverse mud decals
  await extractDecal(240, 10, 150, 150, 'mud_decal_1.png'); // big round splash
  await extractDecal(380, 10, 140, 150, 'mud_decal_2.png'); // flying splatter
  await extractDecal(510, 10, 140, 140, 'mud_decal_3.png'); // cracked dry mud
  await extractDecal(520, 270, 150, 130, 'mud_decal_4.png'); // fine dirt spray
  await extractDecal(760, 500, 140, 140, 'mud_decal_5.png'); // dirt smear / streak
  await extractDecal(620, 740, 150, 150, 'mud_decal_6.png'); // wet burst splash

  // 2. Process Aged Midsole Sidewall Texture
  const soleSrc = 'C:/Users/Divin/.gemini/antigravity/brain/cad6abad-a15d-4496-a241-cd2581300de4/aged_vintage_sneaker_midsole_sidewall_1792731519148.jpg';
  const soleMeta = await sharp(soleSrc).metadata();
  console.log('Sole meta:', soleMeta);

  // Extract the textured midsole strip (middle region)
  const soleCrop = await sharp(soleSrc)
    .extract({
      left: 0,
      top: Math.round(soleMeta.height * 0.25),
      width: soleMeta.width,
      height: Math.round(soleMeta.height * 0.50),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sData = soleCrop.data;
  const sWidth = soleCrop.info.width;
  const sHeight = soleCrop.info.height;
  const sOutBuffer = Buffer.alloc(sWidth * sHeight * 4);

  for (let i = 0; i < sWidth * sHeight; i++) {
    const r = sData[i * 3];
    const g = sData[i * 3 + 1];
    const b = sData[i * 3 + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    let alpha = 255;

    // Soft fade out extreme white boundaries
    if (brightness > 245) {
      alpha = Math.max(0, Math.min(255, Math.round((255 - brightness) / 10 * 255)));
    }

    sOutBuffer[i * 4] = r;
    sOutBuffer[i * 4 + 1] = g;
    sOutBuffer[i * 4 + 2] = b;
    sOutBuffer[i * 4 + 3] = alpha;
  }

  const soleOutPath = path.join(publicDir, 'midsole_yellow_texture.png');
  await sharp(sOutBuffer, {
    raw: {
      width: sWidth,
      height: sHeight,
      channels: 4,
    },
  })
    .png()
    .toFile(soleOutPath);

  console.log('Saved midsole texture to:', soleOutPath);
  console.log('Done processing all assets!');
}

main().catch(console.error);
