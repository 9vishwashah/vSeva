import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Source logo (use the removebg version for transparency)
const logoPath = path.join(root, 'assets', 'vseva-logo-removebg-preview.png');
const publicDir = path.join(root, 'public');

// Background color matching the app theme (cream/off-white)
const bgColor = { r: 253, g: 251, b: 247, alpha: 1 }; // #FDFBF7

async function generateIcon(size) {
    // For maskable icons, use 80% safe zone = logo fills 75% of canvas
    // For regular icons, logo can fill 80% of canvas (tighter padding)
    const logoSize = Math.round(size * 0.75);
    const padding = Math.round((size - logoSize) / 2);

    const resizedLogo = await sharp(logoPath)
        .resize(logoSize, logoSize, {
            fit: 'contain',        // Keep aspect ratio, fit inside logoSize x logoSize
            background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent bg for resize
        })
        .toBuffer();

    // Compose: cream background + centered logo
    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: bgColor
        }
    })
        .composite([{
            input: resizedLogo,
            top: padding,
            left: padding
        }])
        .png()
        .toFile(path.join(publicDir, `pwa-${size}x${size}.png`));

    console.log(`✅ Generated pwa-${size}x${size}.png (${logoSize}px logo on ${size}px canvas)`);
}

// Also generate apple-touch-icon (180x180) and favicon
async function generateAll() {
    await generateIcon(192);
    await generateIcon(512);

    // Apple touch icon (180x180) - same approach
    const size180 = 180;
    const logoSize180 = Math.round(size180 * 0.75);
    const padding180 = Math.round((size180 - logoSize180) / 2);

    const resized180 = await sharp(logoPath)
        .resize(logoSize180, logoSize180, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

    await sharp({
        create: {
            width: size180,
            height: size180,
            channels: 4,
            background: bgColor
        }
    })
        .composite([{ input: resized180, top: padding180, left: padding180 }])
        .png()
        .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('✅ Generated apple-touch-icon.png (180x180)');

    // Also copy to root public as vseva-logo.png (used in OG tags)
    const logoSize512 = Math.round(512 * 0.80);
    const padding512 = Math.round((512 - logoSize512) / 2);
    const resized512 = await sharp(logoPath)
        .resize(logoSize512, logoSize512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: bgColor
        }
    })
        .composite([{ input: resized512, top: padding512, left: padding512 }])
        .png()
        .toFile(path.join(publicDir, 'vseva-logo.png'));

    console.log('✅ Generated vseva-logo.png (512x512 for OG)');
}

generateAll().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
