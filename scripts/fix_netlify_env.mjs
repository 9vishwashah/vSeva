import fs from 'fs';
import path from 'path';

const functionsDir = path.join(process.cwd(), '../netlify', 'functions');

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir);
  let updatedCount = 0;
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(functionsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      const regex = /process\.env\.SUPABASE_URL\s*\|\|\s*process\.env\.VITE_SUPABASE_URL/g;
      const regex2 = /process\.env\.SUPABASE_URL,/;
      
      if (regex.test(content)) {
        content = content.replace(regex, `(process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL)`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
        updatedCount++;
      } else if (regex2.test(content)) {
        // Just in case it's only process.env.SUPABASE_URL
        content = content.replace(/process\.env\.SUPABASE_URL,/, `(process.env.SUPABASE_URL && process.env.SUPABASE_URL.includes('.supabase.co') ? process.env.SUPABASE_URL : process.env.VITE_SUPABASE_URL),`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
        updatedCount++;
      }
    }
  }
  console.log(`Total files updated: ${updatedCount}`);
} else {
  console.log('Functions directory not found:', functionsDir);
}
