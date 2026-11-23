# Vine India — website

The public website and admin panel for Vine India.

- **Frontend:** React 19 + Vite, served as a static site.
- **Backend:** Supabase project `vine-church-website` (ref `bkcaozczhiyxlkghtidl`, Mumbai region). It holds the Postgres database with row-level security, admin sign-in with optional two-step verification, photo storage, and three Edge Functions.

```
src/            React app (public pages in pages/, admin panel in admin/)
public/         Static files: logo, placeholder photos, share image, host config
supabase/       Database migrations and Edge Functions (the backend)
```

## How it works

| Part | Where |
|---|---|
| Site content (settings, live status, sessions, activities, ministries, leaders, gallery, sermons) | `site_config` and `content_items` tables. Anyone can read them; only admins can write. |
| Contact and prayer form | `contact` Edge Function. It checks a hidden spam trap, consent, optional Cloudflare Turnstile, and a limit of 5 messages per hour from one IP address, then stores the message in `messages`, which only admins can read. |
| Sermon library | `youtube-sync` Edge Function. It reads the channel's or playlist's public YouTube feed every 20 minutes (pg_cron), and admins can trigger it with **Sync now**. Videos are kept after they drop out of the feed. |
| Giving-change alert | Changing any UPI or bank field writes to `audit_log`. A trigger then calls the `notify` Edge Function, which emails the church. |
| Link safety | Every link or image field is checked twice: in the database (`clean_url`) and in the browser (`safeUrl`). Only `https://` links and same-site paths are allowed. |
| Data retention | A nightly job deletes messages older than the number of months set under **Site settings → Privacy & data** (default 12). |
| Time zones | Service times are entered in church time (`Asia/Kolkata`). Visitors abroad see the zone name and their own local time, and the countdown is correct for them. |

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5173
npm run lint
npm run build                # output in dist/ (also refreshes src/lib/site-snapshot.json)
```

**Showing the site to someone remotely** (tunnel, port forwarding, another device): don't share
`npm run dev`. It sends hundreds of unbundled files and is very slow over a tunnel. Share the
production build instead:

```bash
npm run build && npm run preview   # http://localhost:5173, compressed and bundled
```

**Why pages appear instantly:** a copy of the church's public content is saved into the bundle at
build time (`scripts/snapshot-site.mjs` → `src/lib/site-snapshot.json`). Visitors see it straight
away, even if Supabase is slow or blocked on their network, and the live data replaces it in the
background. Rebuild after big content changes so first-time visitors start from fresh content.

## Deploying the frontend

Any static host works. Cloudflare Pages is free and fast in India.

1. Connect the GitHub repo. Build command: `npm run build`. Output folder: `dist`.
2. Set the environment variables from `.env.example`. Set `VITE_SITE_URL` to the real domain.
3. The host configuration is already included:
   - `public/_redirects` and `public/_headers` for Cloudflare Pages and Netlify
   - `vercel.json` for Vercel

   Both set the page-link fallback and the security headers, including a Content-Security-Policy.

## One-time Supabase setup (dashboard)

1. **Turn off public sign-ups.** Go to Authentication → Sign In / Providers → Email and turn off *Allow new users to sign up*. Admins are invited, not self-registered.
2. **Set the URLs.** Go to Authentication → URL Configuration. Set *Site URL* to your domain and add `https://YOUR-DOMAIN/admin` to the *Redirect URLs*.
3. **Set the password rules.** Go to Authentication → Policies (or Providers → Email). Set the minimum length to 10 and turn on leaked-password protection.
4. **Turn on two-step verification.** Go to Authentication → Multi-Factor and enable TOTP. It is usually on by default.
5. **Set up email for login links.** Add custom SMTP under Authentication → Emails → SMTP. The built-in sender is rate-limited and only meant for testing. Resend's free tier is enough.
6. **Add the Edge Function secrets.** Go to Edge Functions → Secrets:

   | Secret | Purpose |
   |---|---|
   | `SITE_URL` | `https://your-domain`, used for links in emails |
   | `NOTIFY_EMAIL` | Who receives new-message and giving-change alerts (comma-separated) |
   | `RESEND_API_KEY` | From resend.com. Without it, no alert emails are sent. |
   | `NOTIFY_FROM` | For example `Vine Church Website <website@your-domain>`. The domain must be verified in Resend. |
   | `ALLOWED_ORIGINS` | Optional. For example `https://your-domain`, which limits the contact form to your site. |
   | `TURNSTILE_SECRET_KEY` | Optional. Cloudflare Turnstile secret. Also set `VITE_TURNSTILE_SITE_KEY` on the host. |

## Managing admins

Each person gets their own account; never share a password.

1. In Supabase, go to Authentication → Users → **Invite user** and enter their email.
2. In the SQL editor, run:
   ```sql
   select public.grant_admin('their@email.com');
   ```
3. They click the email link, choose a password, and sign in at `/admin`. Ask them to turn on two-step sign-in under **Account & security**.

To remove someone, run `select public.revoke_admin('their@email.com');` and delete the user.

## Photos

The church photos are in use. The full-size originals are in `photos-original/`, which is not deployed and not in git; keep a backup elsewhere.
- `public/photos/*.jpg`: the fixed section backgrounds.
  - `sunday-worship` is the home banner.
  - `church-family` is the welcome section and the Gallery page header.
  - `sunday-service` is the message section.
  - `worship-service` is the giving section.
  - `evening-worship` is the header of the other pages.

  To change one, replace the file and keep its name.
- `public/gallery/vine-NN.webp`: the 34 gallery photos. These are listed in the database, so admins can reorder, recaption or remove them, and add new ones by uploading in the admin panel.
- `public/og-image.jpg`: the 1200×630 preview shown when the link is shared on WhatsApp or Facebook.
- Official logos: `public/logo.png` (round colour logo, also the source of `favicon.png`, `icon-192.png` and `apple-touch-icon.png`) and `public/logo-white.png` (white horizontal logo, used on the dark footer). The originals are in `photos-original/logos/`.

## Database changes

Migrations are in `supabase/migrations/` and have already been applied to the live project. If you move to a new Supabase project:
- apply them in order;
- change the project ref in `functions_base_url()`;
- redeploy the functions in `supabase/functions/`. All three use `verify_jwt = false` because they do their own checks.

## Accounts: members and admins

- **Sign in** (header button, or `/account`) is for church members and admins.
  Members get a member area. Admins are taken to the admin panel (`/admin`).
- Admins create accounts under **Admin → People & access**. Each new account gets a
  temporary password (with a ready-to-send message), and the person must choose their own
  password the first time they sign in. Admins can also change access (member/admin),
  reset passwords and remove accounts. There must always be at least one admin.
- Roles: an account is an **admin** if it's in `public.admins`, and a **member** if its
  `app_metadata.role` is `member` (only the server can set this). Managed by the `team`
  Edge Function.
- **First admin (one time):** in the Supabase dashboard open Edge Functions → Secrets and add
  `SETUP_CODE` (any private phrase, 8+ characters). Then open the website's Sign in page: while no
  admin exists it shows **Set up the first admin**. Enter your name, email, a password and the
  setup code. Once an admin exists, the setup screen disappears and the code stops working
  (you can delete the secret). Then turn **off** "Allow new users to sign up"
  (Authentication → Sign In / Providers) and add everyone else from the admin panel.

## YouTube

- Set the channel in Admin → Site settings (currently `UCC7vPhpje0mwTL-9Uc_tpYg`).
- The message library refreshes every 10 minutes (Shorts and not-yet-aired streams are left out).
- Live streams are detected automatically every minute: when the channel goes live, the
  website shows the live player and a LIVE badge by itself. A scheduled stream is shown on
  the Services page with a "Set a reminder" link. The manual switch in Admin → Live &
  sessions only forces live on.
