# Deployment Guide for ChatGPT Review

This guide will help you deploy your app so ChatGPT can review it thoroughly.

## Quick Deploy to Netlify (5 minutes)

### Step 1: Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub (recommended)

### Step 2: Deploy Your App

**Option A: Drag & Drop (Easiest)**
1. Run `npm run build` in your project
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag your `dist` folder onto the page
4. Wait 30 seconds for deployment
5. You'll get a URL like `https://random-name-123456.netlify.app`

**Option B: Git Deploy (Better for Updates)**
1. Push your code to GitHub
2. Go to Netlify Dashboard
3. Click "Add new site" > "Import an existing project"
4. Connect to GitHub and select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

### Step 3: Configure Environment Variables
1. In Netlify Dashboard, go to: Site settings > Environment variables
2. Add these variables (copy from your `.env` file):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Redeploy the site

### Step 4: Create a Demo Account (Important!)
Since your app requires authentication, create a demo account:

1. Go to your deployed URL
2. Register a new account with credentials like:
   - Email: `demo@example.com`
   - Password: `DemoPass123!`
3. Add some sample data (customers, CSP events, etc.)

### Step 5: Share with ChatGPT
Give ChatGPT:
```
URL: https://your-app.netlify.app
Demo Login:
- Email: demo@example.com
- Password: DemoPass123!

Please thoroughly review this CSP (Carrier Service Provider) management application and provide feedback on:
1. UI/UX design and usability
2. Feature completeness
3. Navigation and information architecture
4. Performance and responsiveness
5. Any bugs or issues you encounter
6. Suggestions for improvements
```

---

## Alternative: Vercel Deployment

### Quick Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your repository
5. Vercel auto-detects Vite settings
6. Add environment variables (same as Netlify)
7. Deploy

---

## Alternative: Local with ngrok (Temporary Access)

If you want to keep it local and just give ChatGPT temporary access:

### Step 1: Install ngrok
```bash
# macOS
brew install ngrok

# Windows (via Chocolatey)
choco install ngrok

# Or download from ngrok.com
```

### Step 2: Start Your Dev Server
```bash
npm run dev
```

### Step 3: Create Public Tunnel
```bash
ngrok http 5173
```

You'll get a URL like: `https://abc123.ngrok-free.app`

**Important**:
- This URL expires when you close ngrok
- Free tier has session limits
- Good for quick reviews, not long-term access

---

## Recommended Approach

For ChatGPT review, I recommend **Netlify Drag & Drop**:

1. **Build your app**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**: Drag `dist` folder to app.netlify.com/drop

3. **Add environment variables** in Netlify dashboard

4. **Create demo account** with sample data

5. **Share URL and credentials** with ChatGPT

This gives ChatGPT full access to test everything without time limits.

---

## Security Note

Since you're creating a demo account for review:
- Use a dummy email and simple password
- Don't include real customer data
- Consider disabling the demo account after review
- You can delete the Netlify site when done

---

## Troubleshooting

**Build fails on Netlify?**
- Check that all dependencies are in `package.json`
- Ensure `VITE_` environment variables are set
- Check build logs for specific errors

**Can't log in after deployment?**
- Verify Supabase environment variables are correct
- Check Supabase project is accessible publicly
- Ensure Supabase URL doesn't have trailing slash

**Pages return 404?**
- Ensure `netlify.toml` is in your project root
- Check that redirects are configured
- Verify `dist` folder contains `index.html`
