# MEDIXA Step 40

Authoritative baseline: the attached MEDIXA-Step-38.zip (extracted 2026-10-18). Step 38 progress files are preserved in docs/checkpoints/step38/.

## Completed in Step 40 — unified backup covers every per-lecture study module
- Inventoried every study storage key (BACKUP-COVERAGE.md). Before Step 40 the unified backup covered 5 of 11 per-lecture keys; timer and goals were listed but never matched.
- Fixed a cross-lecture bug: prefix matching let lecture `a.pdf` read or overwrite Study Suite keys of `a.pdf.<anything>`. Keys are now matched exactly.
- New export format `medixa-local-backup-v40` (lecture name + absolute URL) covering all 11 keys; legacy v8.7 files still import (only the keys v8.7 exported).
- Import reads every current value first, verifies each write, restores exact previous bytes on any failure, reports failed rollback, and merges ink (never deletes strokes). Corrupted existing ink blocks the import. Export skips and reports corrupted values.
- 19 runtime cases (tests/backup-runtime.cjs, in npm test) + headless-Chromium round trip (tests/step40_backup_browser.py). Mutation checks confirmed the tests fail when rollback, write verification, document check or ink de-duplication is removed.
- Found: on the PDF reader the ink-backup panel covers the unified backup button, and on phones several floating tools overlap (timer, workspace, masks, page navigation, diagnostics). Not fixed in Step 40 — next milestone.

## Completed in Step 39 — login interface merged into Step 38
- Compared both projects: Step 38 had no login, accounts or Firebase code; the Claude project's login is Google Sign-In + Cloudflare D1 (deployed on main earlier).
- Three-way merge (common ancestor v8.1): only login changes applied; Step 38 study modules, educational content, PDFs, rasters, courses.js and storage keys untouched. Details and the full file list: AUTH-INTEGRATION.md.
- Login UI files are byte-identical to the Claude version (design, styling, responsiveness preserved). Account button in the header, account pages (privacy, terms, admin, announcements), roles, uploads by account, announcements on the home page, sync of ms.* progress keys.
- Two Step 32 baseline server files were deliberately edited (upload API entry point and upload core). The baseline guard now pins their exact new hashes with a documented reason; all other 91 files still match Step 32 byte-for-byte.
- npm test now also runs the server-side auth, middleware, upload and KV checks.
- New browser test tests/step39_login_integration.py (simulated server).
- Owner requests kept from the Claude project: header login button on one line on phones; university-name line removed from the home hero.

## Pending / known limitations
- Live Google Sign-In and real Cloudflare D1 were NOT tested in Step 39. Tests use tests/dev_server.mjs with a mock D1/KV and a locally signed test token. (The same login code was tried live by the owner on main.medixa.pages.dev before this merge.)
- Study Mode data remains local to each device; it is not synced to the account.
- Google OAuth consent screen is in Testing mode; new preview domains must be added to Authorized JavaScript origins.
- Old UI tests (ui_check.py, phase1_check.py, parts of nav_check.py) target the pre-v8.1 homepage and fail by design; not rewritten.
- All Step 38 limitations still apply (in-memory drafts, no atomic cross-tab storage, unified backup coverage incomplete, no real device/PDF testing).

## Last successful tests
See TEST-RESULTS.md.

## Next exact task
Step 41: put the reader's floating study tools in one bottom dock so nothing overlaps on phone, iPad or desktop (see NEXT-STEP.md).

## Execution rules
Export a complete standalone ZIP at each milestone. No GitHub push, main modification, Cloudflare deployment, or production Firebase/Google/D1 changes. Retain student storage keys and educational content.
