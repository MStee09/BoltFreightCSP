const fs = require('fs');
const path = require('path');

async function deployFunction() {
  const functionContent = fs.readFileSync(
    path.join(__dirname, 'supabase/functions/resync-gmail/index.ts'),
    'utf-8'
  );

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/resync-gmail`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'resync-gmail',
      slug: 'resync-gmail',
      verify_jwt: true,
      files: [{
        name: 'index.ts',
        content: functionContent
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Deployment failed:', error);
    process.exit(1);
  }

  console.log('✅ Function deployed successfully');
}

deployFunction().catch(console.error);
