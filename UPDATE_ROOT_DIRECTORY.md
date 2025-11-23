# How to Change Root Directory in Existing Vercel Project

Since the Vercel UI won't let you change the root directory after the first deployment, here are your options:

## Method 1: Use Vercel API (Recommended)

You can update the root directory using the Vercel API:

### Step 1: Get Your Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it (e.g., "Update Root Directory")
4. Copy the token (you'll only see it once!)

### Step 2: Get Your Project ID

1. Go to your Vercel project dashboard
2. Go to **Settings** → **General**
3. Look for **"Project ID"** - copy it

### Step 3: Update Root Directory via API

Run this command (replace `YOUR_TOKEN` and `YOUR_PROJECT_ID`):

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/YOUR_PROJECT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory": "with-supabase-app"}'
```

Or use PowerShell:

```powershell
$token = "YOUR_TOKEN"
$projectId = "YOUR_PROJECT_ID"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$body = @{
    rootDirectory = "with-supabase-app"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$projectId" -Method PATCH -Headers $headers -Body $body
```

---

## Method 2: Use Vercel CLI (Alternative)

1. **Login to Vercel**:
   ```bash
   cd C:\Users\Administrator\bltz\with-supabase-app
   npx vercel login
   ```
   - Visit the URL shown
   - Authorize the CLI

2. **Link your project**:
   ```bash
   npx vercel link
   ```
   - Select your existing project
   - This creates `.vercel/project.json`

3. **Update project settings**:
   Unfortunately, the CLI doesn't directly support changing root directory. You'll need to use Method 1 (API) or Method 3.

---

## Method 3: Delete and Recreate (Simplest)

If the API method seems complicated, the easiest way is:

1. **Export your environment variables** (if you have many):
   - Go to **Settings** → **Environment Variables**
   - Copy all your env vars to a text file

2. **Delete the project**:
   - **Settings** → Scroll down → **Delete Project**

3. **Create new project**:
   - **Add New...** → **Project**
   - Import same GitHub repo
   - **Set Root Directory to `with-supabase-app`** ⚠️ **BEFORE deploying**
   - Add environment variables back
   - Deploy

This takes about 5 minutes and is the most reliable method.

---

## Method 4: Update vercel.json (May Not Work)

The `vercel.json` file at the root should help, but Vercel might ignore it if the project was already created. Try:

1. Make sure `vercel.json` is at the repo root (not in `with-supabase-app/`)
2. Commit and push it
3. Redeploy in Vercel

The current `vercel.json` has:
```json
{
  "buildCommand": "cd with-supabase-app && npm ci && npm run build",
  "outputDirectory": "with-supabase-app/.next",
  "installCommand": "cd with-supabase-app && npm ci",
  "framework": "nextjs"
}
```

---

## Which Method Should You Use?

- **Method 1 (API)**: If you're comfortable with API calls
- **Method 3 (Delete/Recreate)**: If you want the simplest, most reliable solution
- **Method 4 (vercel.json)**: Try this first - it's the easiest if it works

Let me know which method you'd like to try!

