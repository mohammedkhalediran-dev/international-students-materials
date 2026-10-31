# MEDIXA Step 43

Authoritative baseline: the attached MEDIXA-Step-38.zip (extracted 2026-10-18). Step 38 progress files are preserved in docs/checkpoints/step38/.

## Completed in Step 43 — the PDF reader no longer dead-ends when pdf.js is blocked
- Before: if the cdnjs pdf.js library could not load (blocked network), every lecture showed only an error and the status stayed on "loading"; the bundled page images were never used because the code returned first.
- Now: lectures with bundled page images (the 4 in pdf-raster-manifest.js) open from those images with a short explanation; drawing, saving, study tools and the dock work. Annotated-PDF download and text search say they are unavailable.
- Lectures without page images (uploaded later) show a clear Arabic explanation, an "open the file directly" link (same-origin http/https only, so a crafted `file=` value cannot inject a link) and a retry button; the status line no longer says loading. A missing/broken PDF with pdf.js available shows the same recovery actions.
- tests/step43_offline_pdf_browser.py: 20 headless-Chromium checks.

## Completed in Step 42 — a second tab or a corrupted value can no longer erase study work
- Audit (STORAGE-SAFETY.md): ink, cards/notes/quiz (pdf-notes), quick-tools workspace v8.6 and goals v8.4 wrote stale in-memory data over newer data from another tab or a backup import; ink and cards also replaced unparseable stored data with empty values on the next edit.
- New `site/js/study-storage-guard.js`: guarded modules refuse to save when storage changed since they last read or wrote it, never overwrite corrupted values, verify writes and restore previous bytes. The student is told to reload. Keys and formats unchanged. Study Suite v8.5 and masks already had equivalent protection; timer and reader bookmarks stay last-writer-wins (documented).
- 13 runtime cases (npm test) + 15 headless-Chromium two-tab checks.

## Completed in Step 41 — reader tools no longer overlap
- New `site/js/study-dock-v91.js` (layout only, loaded last): one bottom toolbar holds page navigation, Study Mask, timer, quick tools, unified backup, ink backup and save state. It moves the existing elements; handlers, state and storage keys are unchanged.
- The always-open ink-backup panel became a button + popup; all popups open above the dock. The page gets bottom padding so the last PDF page is fully visible. On narrow screens the dock scrolls sideways with a fade on the far edge.
- tests/step41_dock_browser.py (headless Chromium, 48 checks at 390/820/1280 px): every tool is the top element at its centre, popups open above the dock, ink export works from the popup, page navigation works, last page visible, no horizontal page scroll, no JS errors. step40_backup_browser.py now uses real clicks. Static audit checks the dock loads after every floating tool.

## Completed in Step 40 — unified backup covers every per-lecture study module
- Inventoried every study storage key (BACKUP-COVERAGE.md). Before Step 40 the unified backup covered 5 of 11 per-lecture keys; timer and goals were listed but never matched.
- Fixed a cross-lecture bug: prefix matching let lecture `a.pdf` read or overwrite Study Suite keys of `a.pdf.<anything>`. Keys are now matched exactly.
- New export format `medixa-local-backup-v40` (lecture name + absolute URL) covering all 11 keys; legacy v8.7 files still import (only the keys v8.7 exported).
- Import reads every current value first, verifies each write, restores exact previous bytes on any failure, reports failed rollback, and merges ink (never deletes strokes). Corrupted existing ink blocks the import. Export skips and reports corrupted values.
- 19 runtime cases (tests/backup-runtime.cjs, in npm test) + headless-Chromium round trip (tests/step40_backup_browser.py). Mutation checks confirmed the tests fail when rollback, write verification, document check or ink de-duplication is removed.
- Found the reader's floating tools overlapping (fixed in Step 41).

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
Step 44: see NEXT-STEP.md.

## Execution rules
Export a complete standalone ZIP at each milestone. No GitHub push, main modification, Cloudflare deployment, or production Firebase/Google/D1 changes. Retain student storage keys and educational content.
