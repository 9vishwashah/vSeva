const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf';
const dest = path.join(process.cwd(), 'src/assets/NotoSansDevanagari-Regular.ts');

https.get(url, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    https.get(res.headers.location, handleResponse).on('error', console.error);
    return;
  }
  handleResponse(res);
}).on('error', console.error);

function handleResponse(res) {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    const base64 = buffer.toString('base64');
    const tsContent = `export const NotoSansDevanagariBase64 = '${base64}';`;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, tsContent);
    console.log('Font successfully downloaded and converted to base64');
  });
}
