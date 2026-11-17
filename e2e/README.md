# Browser end-to-end scripts (Playwright + system Edge)

Run against a LOCAL stack on a disposable database copy, never production:

1. Backend: `USE_SQLITE=1 DJANGO_CSRF_TRUSTED_ORIGINS=http://127.0.0.1:3100 python manage.py runserver 127.0.0.1:8000` (copy of the dev DB; create users `e2e_boss` (membership is_super_admin=True) and `e2e_staff` (role viewer), password in the scripts).
2. Frontend: `npm run build -- --webpack` then `BACKEND_URL=http://127.0.0.1:8000 npx next start -p 3100`.
3. `npm i --no-save playwright-core` then `VP=all node e2e/crawl.mjs out` (every module x 7 viewports), `node e2e/flows.mjs out` (29 UI workflows), `node e2e/printlong.mjs` (multi-page A4 print).

Browsers are not downloaded: scripts use the installed Microsoft Edge (`channel: 'msedge'`).
`DJANGO_CSRF_TRUSTED_ORIGINS` must contain the frontend origin or every browser POST is rejected with 403 (also in production).
