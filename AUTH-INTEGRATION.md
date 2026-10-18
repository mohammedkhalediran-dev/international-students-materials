# Step 39 — Login integration into Step 38

## What Step 38 had
No login, no accounts, no Firebase code or configuration (Firebase is only mentioned in older notes as "not done"). Its server side was the lecture-upload API only (`functions/api/[[path]].js`, `functions/_lib/kvstore.js`, `netlify/lib/core.mjs`).

## What was brought in
Source: the Claude project branch `feature/medixa-v8.1-with-auth` (commit 88735e0), which is MEDIXA v8.1 plus the login system that is already deployed and was tested by the owner on main.medixa.pages.dev. The login uses **Google Sign-In + Cloudflare D1**, not Firebase.

Merge method: a three-way merge with v8.1 as the common ancestor, so only the login changes were applied on top of Step 38. Step 38 files that the login did not touch were left byte-identical. Files changed on both sides differed in Step 38 only by cache version strings (verified by normalising `?v=` and the service-worker cache name), so the login versions were used and every version was set to `step39`. `site/js/i18n.js` merged automatically and keeps all Step 38 strings.

### New files
- Login UI (byte-identical to the Claude version): `site/login.html`, `site/css/login.css`, `site/js/login.js`, `site/js/login-i18n.js`, `site/assets/login/*`.
- Account pages: `site/privacy.html`, `site/terms.html`, `site/admin.html` + `js/admin.js` (suspend accounts, assign roles), `site/announce.html` + `js/announce.js` (class announcements).
- Client: `site/js/auth.js` (header account button, session check, sync of `ms.fav ms.read ms.last ms.exam ms.review ms.study`).
- Server: `functions/_lib/auth.js` (Google ID-token verification RS256, sessions in HttpOnly cookie, roles, sync, announcements), `functions/_middleware.js` (optional REQUIRE_LOGIN), `migrations/0001_init.sql`, `migrations/0002_announcements.sql`.
- Tests: `tests/auth_api_check.mjs`, `tests/middleware_check.mjs`, `tests/mock_d1.mjs`, `tests/google_token.mjs`, `tests/auth_e2e.py`, `tests/v81_auth_smoke.py`, `tests/step39_login_integration.py`; `tests/dev_server.mjs` and `tests/upload_api_check.mjs` updated.

### Edited Step 38 files
- `functions/api/[[path]].js`: calls `handleAuth` first; passes `uploadAccount(env)` to the upload core.
- `netlify/lib/core.mjs`: accepts an upload by a signed-in uploader/rep/admin account (upload codes still work).
- `site/js/app.js`: one hook `if (MS.onSave) MS.onSave(k);` so saved progress can sync.
- `site/js/upload.js`: account sign-in path on the upload page.
- `site/js/home.js`, `site/index.html`: announcements section; the university name line removed from the hero (owner's request).
- `site/css/style.css`: announcement cards; header login button kept on one line on phones.
- `site/sw.js`: never caches `/api/auth/*`, `/api/sync`, `/api/announcements` or redirected responses; cache `medixa-step39`.
- `<script src="js/auth.js">` added after `app.js` in index, course, semester, study, workspace and upload pages.
- `tests/baseline-preservation.cjs`: the two server files above are listed in `tests/baseline-intentional-changes.json` with their exact new SHA-256; every other baseline file must still match Step 32.

### Not changed
All Study Mode modules, `pdf-notes.html` logic, educational content, PDFs and raster images, `courses.js`, Step 38 study storage keys. The Step 38 Immune System PDF was kept (not the main-branch copy).

## Storage and data
- Study Mode data (`medixa.study.*`, `medixa.pdf.annotations.v1:*`, `ms.notes`, timer/planner/workspace/backup keys) stays local on the device and is **not** synced or cleared by login/logout.
- Logout clears only the synced `ms.*` keys listed above after flushing them to the account; they come back on the next sign-in.

## Cloudflare settings needed (unchanged, already set for the live project)
`DB` (D1 binding), `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, optional `REQUIRE_LOGIN=1`. Without `GOOGLE_CLIENT_ID` the Google button is disabled and guest mode works. Any new preview domain must be added to Authorized JavaScript origins in Google Cloud Console.
