# ICP Tier Scorecard — Marketing / Partner Link

Self-contained copy of the ICP Quality Tier Scorecard for deployment as a standalone link (e.g. Vercel) for marketing partners. **Protected by a password**. Lives at `undeniable/icp-scorecard-marketing` (isolated from the agency_archetype_scoring repo).

## Password protection

- **Root (`/`)** is guarded: visitors are redirected to **`/login`** until they sign in with the correct password.
- Password is **never in code**. It is read only from **environment variables** (or a local `.env` file that is gitignored).
- To change the password: update **`SCORECARD_PASSWORD`** in Vercel (Project → Settings → Environment Variables) or in `.env.local` for local use. Do not commit `.env` or `.env.local`.

### Required environment variables

| Variable | Purpose |
|----------|--------|
| `SCORECARD_PASSWORD` | Password required to access the scorecard. Set this to your chosen value (e.g. in Vercel or in `.env.local`). |
| `SESSION_SECRET` | Secret used to sign session cookies. Must be at least 32 characters; use a long random string. |

Copy `.env.example` to `.env.local` and fill in real values for local development. For Vercel, set both variables in the project’s Environment Variables.

## Contents

- **index.html** — Full scorecard; served at `/` only after successful login (via `/api/guard`).
- **login.html** — Login page at `/login` (same design system as the scorecard).
- **api/guard.js** — Ensures `/` is only served when a valid session cookie is present.
- **api/login.js** — POST handler: checks password (env), sets signed httpOnly cookie, redirects to `/`.
- **api/logout.js** — Clears session cookie and redirects to `/login`.
- **vercel.json** — Rewrites `/` to `/api/guard`; clean URLs.

## Deploy on Vercel

1. Set environment variables in the Vercel project:
   - `SCORECARD_PASSWORD` — your chosen password.
   - `SESSION_SECRET` — a long random string (e.g. 32+ chars).

2. Deploy from this directory:

```bash
cd /path/to/undeniable/icp-scorecard-marketing
vercel
```

After deploy, opening the project URL shows the login page; after signing in, users see the scorecard. **Sign out** in the header clears the session.

## Security notes

- Password comparison uses **constant-time** comparison to reduce timing attacks.
- Session cookie is **httpOnly**, **SameSite=Strict**, **Secure** in production; signed with **HMAC-SHA256** so it cannot be forged without `SESSION_SECRET`.
- Login error message is a fixed string (no user input reflected), avoiding XSS.
- `.env` and `.env.local` are gitignored; do not commit secrets.

## Dependencies

- **External only:** Google Fonts (Anton, Inter). All other assets are inline.
