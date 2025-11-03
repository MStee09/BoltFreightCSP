# Complete Supabase Migration Guide

This guide will walk you through migrating this application to your own Supabase instance.

## Prerequisites

1. A Supabase account (free tier works fine)
2. A new Supabase project created at https://supabase.com/dashboard

## Step 1: Create Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: Choose any name (e.g., "TMS Production")
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be created

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `COMPLETE_DATABASE_MIGRATION.sql` from this project
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
7. Wait for it to complete (may take 30-60 seconds)
8. You should see "Success. No rows returned" or similar

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys" - the long key labeled "anon public")

## Step 4: Update Your .env File

1. Open the `.env` file in this project
2. Replace these two values:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Save the file

## Step 5: Restart Your Development Server

If your dev server is running, restart it to pick up the new environment variables.

## Step 6: Create Your First Admin User

1. Open your app in the browser
2. Go to the **Register** page
3. Create a new account with your email and password
4. You'll need to manually make this user an admin in the database

### Make User Admin via SQL Editor:

1. Go back to Supabase dashboard → **SQL Editor**
2. Run this query (replace `your-email@example.com` with your actual email):
   ```sql
   UPDATE user_profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```
3. Log out and log back in to your app

## Step 7: Deploy Edge Functions (Optional)

If you want to use the AI features and email functionality, you'll need to deploy the Edge Functions:

### Functions to Deploy:
- `send-email` - Email sending functionality
- `send-invitation` - User invitation emails
- `send-feedback-email` - User feedback emails
- `gmail-webhook` - Gmail integration
- `dashboard-chat` - AI chatbot
- `chat-with-strategy` - Strategy AI assistant
- `generate-snapshot` - Report snapshots
- `generate-strategy-summary` - Strategy summaries

### Deployment Steps:

**Option A: Using Supabase CLI (Recommended)**
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project (get project-ref from dashboard URL)
supabase link --project-ref your-project-ref

# Deploy all functions
cd supabase/functions
supabase functions deploy send-email
supabase functions deploy send-invitation
supabase functions deploy send-feedback-email
supabase functions deploy gmail-webhook
supabase functions deploy dashboard-chat
supabase functions deploy chat-with-strategy
supabase functions deploy generate-snapshot
supabase functions deploy generate-strategy-summary
```

**Option B: Manual Deployment**
1. Go to Supabase Dashboard → **Edge Functions**
2. Click **"Create a new function"**
3. Copy the code from each function file in `supabase/functions/`
4. Deploy each function individually

### Set Environment Secrets (for Edge Functions):

Some Edge Functions need API keys. Set them in Supabase Dashboard → **Edge Functions** → **Settings**:

```bash
# For email functions (if using Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# For AI functions (if using OpenAI)
OPENAI_API_KEY=your-openai-api-key
```

## Step 8: Test Everything

1. **Authentication**: Try logging in/out
2. **Create Data**: Add a customer, carrier, or tariff
3. **Permissions**: Test that admin features work
4. **Email**: Send a test invitation (if email configured)
5. **AI Features**: Try the chatbot (if OpenAI configured)

## Troubleshooting

### "relation does not exist" errors
- Make sure you ran the complete migration SQL file
- Check that all tables were created in SQL Editor → Table Editor

### "permission denied" errors
- Make sure you updated your user role to 'admin'
- Check that RLS policies were created properly

### Environment variables not working
- Make sure .env file is saved
- Restart your dev server completely
- Check that VITE_ prefix is present on all variables

### Edge Functions not working
- Verify they're deployed in dashboard
- Check function logs in Supabase Dashboard
- Ensure environment secrets are set

## Data Migration (If You Have Existing Data)

If you had data in the previous instance that you want to migrate:

1. Export data from old instance (Supabase Dashboard → Table Editor → Export)
2. Import into new instance (Supabase Dashboard → Table Editor → Import)
3. Do this table by table

## Support

If you encounter issues:
1. Check Supabase Dashboard → **Logs** for error messages
2. Check browser console for client-side errors
3. Verify all environment variables are correct
4. Ensure database migration completed successfully

---

**You're all set!** Your app is now running on your own Supabase instance with complete control over your data.
