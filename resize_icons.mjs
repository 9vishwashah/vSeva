import sharp from 'sharp';

async function generateIcons() {
  const input = 'public/vseva-logo-removebg.png';
  
  console.log("Processing images...");
  
  // 192x192 transparent
  await sharp(input)
    .trim()
    .resize({ width: 172, height: 172, fit: 'contain', background: {r:0,g:0,b:0,alpha:0} })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: {r:0,g:0,b:0,alpha:0} })
    .toFile('public/pwa-192x192.png');
    
  console.log("Created pwa-192x192.png");

  // 512x512 transparent
  await sharp(input)
    .trim()
    .resize({ width: 460, height: 460, fit: 'contain', background: {r:0,g:0,b:0,alpha:0} })
    .extend({ top: 26, bottom: 26, left: 26, right: 26, background: {r:0,g:0,b:0,alpha:0} })
    .toFile('public/pwa-512x512.png');
    
  console.log("Created pwa-512x512.png");

  // apple-touch-icon 180x180 white background
  await sharp(input)
    .trim()
    .resize({ width: 160, height: 160, fit: 'contain', background: {r:255,g:255,b:255,alpha:1} })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: {r:255,g:255,b:255,alpha:1} })
    .flatten({ background: '#ffffff' })
    .toFile('public/apple-touch-icon.png');
    
  console.log("Created apple-touch-icon.png");
}

generateIcons().catch(console.error);
