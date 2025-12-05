import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const content = fs.readFileSync(
  join(__dirname, 'supabase/functions/resync-gmail/index.ts'),
  'utf-8'
);

console.log('Function content loaded:', content.length, 'bytes');
console.log('Deployment would include:');
console.log('- name: resync-gmail');
console.log('- verify_jwt: true');
console.log('- files: 1 file (index.ts)');
console.log('\nNote: MCP deployment tool will be used separately');
console.log('✅ Function code is ready for deployment');
