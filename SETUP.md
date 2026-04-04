# 100xbtr OS — Deployment Guide
## From zero to live at 100xbtr.com in ~40 minutes

---

## PART 1 — Supabase (your database, ~10 min)

### Step 1: Create a Supabase project
1. Go to supabase.com and sign in (use your GitHub account)
2. Click **New project**
3. Name it: `100xbtr-os`
4. Set a database password (save it somewhere — you won't need it often)
5. Choose region: **US West (Oregon)** — closest to LA
6. Click **Create new project** and wait ~2 minutes

### Step 2: Run the database setup
1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase_setup.sql` (included in this folder)
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (the green button)
6. You should see "Success. No rows returned" — that means it worked

### Step 3: Get your API keys
1. In Supabase left sidebar, click **Settings** (gear icon at bottom)
2. Click **API**
3. You need two things — copy them somewhere:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

### Step 4: Set up authentication
1. In Supabase left sidebar, click **Authentication**
2. Click **Providers**
3. Make sure **Email** is enabled (it is by default)
4. Click **URL Configuration**
5. In **Site URL**, enter: `https://100xbtr.com`
6. In **Redirect URLs**, add: `https://100xbtr.com`
7. Click Save

---

## PART 2 — Customize the app file (~5 min)

Open `index.html` in any text editor. Find these three lines near the bottom and replace the placeholder values:

```
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const ALLOWED_EMAILS = ['WILL_EMAIL', 'BRENDAN_EMAIL', 'NISHANT_EMAIL'];
```

Replace with your actual values, for example:
```
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
const ALLOWED_EMAILS = ['will@email.com', 'brendan@email.com', 'nishant@email.com'];
```

Save the file.

---

## PART 3 — GitHub (your code home, ~5 min)

### Step 1: Create a new repository
1. Go to github.com and sign in
2. Click the **+** icon top right → **New repository**
3. Name it: `100xbtr-os`
4. Set to **Private** (important — keep this internal)
5. Click **Create repository**

### Step 2: Upload your file
1. On the new repo page, click **uploading an existing file**
2. Drag and drop `index.html` onto the page
3. At the bottom, click **Commit changes**

That's it for GitHub. One file, one commit.

---

## PART 4 — Netlify (your host, ~10 min)

### Step 1: Connect to GitHub
1. Go to netlify.com and sign in (use your GitHub account)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub**
4. Authorize Netlify to access your GitHub
5. Find and select `100xbtr-os`
6. Leave all build settings as defaults (blank)
7. Click **Deploy site**

After ~30 seconds you'll have a URL like `random-name-123.netlify.app` — your app is live.

### Step 2: Test it
1. Go to your Netlify URL
2. Enter your email address
3. Check your email — click the magic link
4. You should land back on the app, logged in
5. Try checking off a decision and adding a log entry

---

## PART 5 — Point your domain (~10 min)

### Step 1: Set custom domain in Netlify
1. In Netlify, go to your site → **Domain management**
2. Click **Add custom domain**
3. Enter: `100xbtr.com`
4. Also add: `www.100xbtr.com`
5. Netlify will show you DNS records to add

### Step 2: Update GoDaddy DNS
1. Log into GoDaddy
2. Go to your domain `100xbtr.com` → **DNS**
3. Add or update the following records:

| Type  | Name | Value                        |
|-------|------|------------------------------|
| A     | @    | 75.2.60.5                    |
| CNAME | www  | [your-site].netlify.app      |

4. Save. DNS changes take 5–30 minutes to propagate.

### Step 3: Enable HTTPS
1. Back in Netlify → **Domain management** → **HTTPS**
2. Click **Verify DNS configuration**
3. Once verified, click **Provision certificate**
4. Free SSL certificate, auto-renews

---

## PART 6 — Invite Brendan and Nishant

Once the site is live at 100xbtr.com:

1. Send them the URL
2. They enter their email (must match what you put in ALLOWED_EMAILS)
3. They click the magic link in their email
4. They're in — full access, real-time sync

That's the entire setup. From here, every decision you check off, every log entry added, every change made by any founder is instantly visible to all three of you.

---

## Maintenance notes

- **Backups**: Supabase backs up your database automatically on their free tier
- **Updating the app**: Edit `index.html` on GitHub (click the file → pencil icon) and Netlify redeploys in ~30 seconds automatically
- **Adding features**: Bring the updated `index.html` to Claude and ask for changes
- **Supabase free tier limits**: 500MB database, 2GB bandwidth/month — you will not hit these limits
- **Netlify free tier limits**: 100GB bandwidth/month — you will not hit these limits

---

## Troubleshooting

**Magic link lands on a blank page**: Make sure your Site URL in Supabase Authentication matches your actual domain exactly (https://100xbtr.com, no trailing slash)

**"Email not registered" error**: Check that the email is exactly as typed in the ALLOWED_EMAILS array in index.html

**Changes not syncing in real time**: Make sure you ran the full supabase_setup.sql script including the `alter publication supabase_realtime` lines at the bottom

**GoDaddy DNS not updating**: DNS propagation can take up to 48 hours but is usually under 30 minutes. Check propagation at dnschecker.org

---

Questions? Bring anything to Claude with "I'm setting up 100xbtr OS and I'm stuck on..."
