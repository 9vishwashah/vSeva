// @capacitor/assets generated a blank/empty legacy (pre-API26) ic_launcher.png
// per density — confirmed via raw pixel sampling (solid white, no logo
// content). This writes the correct legacy icon directly from the same
// source used for resources/icon.png, bypassing that broken compositing
// step. The adaptive icon (mipmap-anydpi-v26 XML + foreground/background
// layers), which the tool generated correctly, is left untouched.
import sharp from 'sharp';

const DENSITIES = {
  ldpi: 36,
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const SOURCE = 'resources/icon.png';

async function run() {
  for (const [density, size] of Object.entries(DENSITIES)) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      await sharp(SOURCE)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(`${dir}/${name}`);
    }
    console.log(`Fixed ${dir}/ic_launcher.png + ic_launcher_round.png (${size}x${size})`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
