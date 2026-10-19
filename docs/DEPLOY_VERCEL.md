# Deploying the frontend to Vercel

Vercel runs only this Next.js app. The Django backend (and the Neon database) run somewhere else (Railway or a VPS).
The browser talks to the app at `https://<project>.vercel.app/backend/...`; Next.js forwards those calls to the backend
(`next.config.ts` rewrite, controlled by `BACKEND_URL`). Because the browser only ever talks to one address, the session and
CSRF cookies work without any CORS setup.

## 1. Put the backend online first
Vercel needs its address. Deploy `Rent-A-Car-server` to Railway or a VPS with HTTPS, and set these there:

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | a new long random string (never the dev one) |
| `DJANGO_DEBUG` | `0` |
| `DJANGO_ALLOWED_HOSTS` | the backend's own host, e.g. `api.example.com` (no `https://`) |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | the Vercel address with `https://`, e.g. `https://rentflow.vercel.app` (add the custom domain too, comma-separated) |
| `DATABASE_URL` | the Neon connection string (quote it) |

Then run `python manage.py migrate` and create the first admin user. Check `https://api.example.com/api/v1/docs` opens.

## 2. Push the client folder to GitHub
`Rent-A-Car-client` is its own git repository. Commit and push it yourself (`vercel.json` is already in it).

## 3. Create the Vercel project
1. vercel.com > **Add New... > Project** > import the client repository.
2. Framework preset: **Next.js** (detected). Root directory: the repository root (it is the client folder).
3. Leave the build settings alone. `vercel.json` sets `npm ci` and `npm run build`.
4. Add these **Environment Variables** (Production, and Preview if you use it) before the first deploy:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_RENTFLOW_API_MODE` | `1` |
| `BACKEND_URL` | `https://api.example.com` (no trailing slash, no `/api/v1`) |

   `NEXT_PUBLIC_...` is baked in when the app is built, so changing it later needs a **redeploy**.
5. Press **Deploy**.

(Or from a terminal: `npm i -g vercel`, `vercel login`, `vercel link`, `vercel env add NEXT_PUBLIC_RENTFLOW_API_MODE production`, `vercel env add BACKEND_URL production`, `vercel --prod`.)

## 4. Connect the two sides
After the first deploy you know the real Vercel address. Put it in the backend's `DJANGO_CSRF_TRUSTED_ORIGINS`,
restart the backend, and sign in at `https://<project>.vercel.app/login`. A custom domain works the same way; add it in
Vercel > Settings > Domains and add it to `DJANGO_CSRF_TRUSTED_ORIGINS` too.

## 5. Check
- `/login` opens and signing in works (a "403 CSRF" means the Vercel address is missing from `DJANGO_CSRF_TRUSTED_ORIGINS`).
- A page loads data (a "400 Bad Request / DisallowedHost" from the backend means `DJANGO_ALLOWED_HOSTS` lacks the backend host).
- The language switch, a CSV download and a print page work.

## Known limits
- Language and Bangla-digit choices are stored in cookies on the Vercel domain.
- Vercel's proxy may limit very large request bodies; receipt uploads are capped at 10 MB by the app, so test one near that size.
- Uploaded files live on the backend's disk (`private_media`), which must be a persistent volume on the backend host.
- Never put the backend secrets in Vercel; only the two variables above belong there.
