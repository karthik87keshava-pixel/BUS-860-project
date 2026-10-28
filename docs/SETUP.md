# Account setup (one person, about 30 minutes in total)

Do these in order. Each step ends with something to send back to Claude Code. Use one shared team email for all three accounts so nobody gets locked out (for example a Gmail made for the project).

## Step 1 — Supabase (sign-in and saved comparisons)

1. Go to https://supabase.com and click **Start your project**. Sign up with **Continue with GitHub** (use the GitHub account that owns the `BUS-860-project` repository).
2. Click **New project**. Organization: your personal one is fine. Name: `drivetally`. Database password: click **Generate a password** and save it in your team password manager (we won't need it in the code). Region: **Canada (Central)**. Plan: **Free**. Click **Create new project** and wait about 2 minutes.
3. In the left menu click **SQL Editor** → **New query**. Open `supabase/schema.sql` from GitHub, copy all of it, paste it in, and click **Run**. You should see "Success. No rows returned".
4. In the left menu click **Project Settings** (gear) → **API** (or **Data API**). Copy the **Project URL** and the **anon public** key. Do **not** copy the `service_role` key.
5. Send both values to Claude Code (the anon key is designed to be public, so chat is fine for it).

## Step 2 — Vercel (hosting)

1. Go to https://vercel.com/signup, choose **Hobby** (free), and **Continue with GitHub**.
2. Click **Add New… → Project**. Find `BUS-860-project` and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to that repository.
3. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from Step 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from Step 1
4. Click **Deploy** and wait about 2 minutes. Copy the address it gives you (like `https://bus-860-project.vercel.app`) and send it to Claude Code.
5. Back in Supabase: **Authentication → URL Configuration**. Set **Site URL** to the Vercel address, and under **Redirect URLs** add `https://YOUR-ADDRESS.vercel.app/**` and `http://localhost:3000/**`. Click **Save**.

At this point email sign-in (magic link) works.

## Step 3 — Google sign-in

1. Go to https://console.cloud.google.com and sign in with the team Google account. Accept the terms.
2. Top bar → project picker → **New project**. Name `DriveTally`, click **Create**, then select it.
3. Menu → **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform**). Click **Get started**. App name `DriveTally`, support email = team email. Audience: **External**. Contact email = team email. Agree and **Create**.
4. **Clients → Create client**. Application type: **Web application**. Name `DriveTally web`.
   - Under **Authorized redirect URIs** click **Add URI** and paste the callback URL shown in Supabase → **Authentication → Sign In / Providers → Google** (it looks like `https://xxxx.supabase.co/auth/v1/callback`).
   - Click **Create**. Copy the **Client ID** and **Client secret**.
5. In Supabase → **Authentication → Sign In / Providers → Google**: switch it **on**, paste the Client ID and Client secret, click **Save**.
6. In Google Cloud → **Audience**, click **Publish app** so anyone (not just test users) can sign in.

Tell Claude Code when this is done; it will test sign-in, saving and sign-out on the live site.

## Free-tier limits worth knowing

- Supabase Free: 500 MB database, 50,000 monthly active users. A free project **pauses after 7 days with no activity**; un-pause it from the Supabase dashboard (one click). Opening the site and signing in counts as activity.
- Vercel Hobby: fine for a class project. It is meant for non-commercial use; a public commercial launch would need the paid Pro plan.
- Magic-link emails come from Supabase's built-in email service, which is limited to a few emails per hour. Enough for a demo; for a public launch, connect an email service (Supabase → Authentication → Emails → SMTP).
