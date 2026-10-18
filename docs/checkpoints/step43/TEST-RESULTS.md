# Step 43 test results — 2026-10-18

## Step 43 additions — PASS
- `python3 -I tests/step43_offline_pdf_browser.py` (headless Chromium, simulated server): 20 checks. CDN blocked + bundled lecture: 23 page images, explanation, ready status, a real mouse stroke saved, study tools and dock present, annotated download explains it is unavailable, no JS errors. CDN blocked + later upload: explanation, same-origin "open directly" link, retry button that reloads the same lecture, status updated, dock loads; no link for `javascript:` or cross-origin sources. CDN available: a later upload (routed to real PDF bytes) renders 23 pages with pdf.js and no offline note; a missing PDF shows the error with retry.
- Re-run: npm test, step39 (29), step40 (6), step41 (48), step42 (15), v81 smoke (45) — PASS.
- Not tested: a real blocked network on a physical device; the browser's own PDF viewer opened by the direct link.

# Step 42 test results

## Step 42 additions — PASS
- `node --test tests/storage-guard-runtime.cjs` (in npm test): 13 cases — fresh key, 4 corrupt/wrong-shape values never overwritten, unreadable storage, two simulated tabs, same-tab backup import detected, deleted key not recreated, quota error, silently dropped write restored, blocked read at save, Arabic messages.
- `python3 -I tests/step42_two_tab_browser.py` (headless Chromium, two pages sharing localStorage): 15 checks — real mouse strokes on the PDF canvas, cards added through the study panel and workspace bookmarks: the stale tab cannot overwrite, explains why, the current tab keeps saving, saving works after reload; corrupted ink and cards stay byte-identical after drawing and adding a card; no JS errors.
- Re-run: npm test (60 + 19 + 13 + 7 + 14 runtime cases and all static checks), step39 login (29), step40 backup (6), step41 dock (48), v81 smoke (45), auth_e2e — PASS.

# Step 41 test results

## Step 41 additions — PASS
- `python3 -I tests/step41_dock_browser.py` (headless Chromium, simulated server): 48 checks at 390, 820 and 1280 px — dock order, each of 7 tools uncovered at its centre, backup / ink / quick-tools popups open above the dock, ink toggle closes, ink export downloads from the popup, page navigation, last PDF page fully above the dock, no horizontal page scroll, no JS errors.
- `tests/step40_backup_browser.py` switched to real clicks: 6 checks PASS.
- npm test (static audit now checks the dock loads after every floating tool), step39_login_integration.py (29), v81_auth_smoke.py (45): PASS.
- Not tested on a physical phone or iPad (Safari safe-area and touch scrolling of the dock are unverified).

# Step 40 test results

## Step 40 additions — PASS
- `node --test tests/backup-runtime.cjs` (part of npm test): 19 cases on the shipped backup script in a Node VM with fault-injectable storage — exact key coverage and no cross-lecture prefix match, 11-key round trip byte-identical with unrelated keys untouched, legacy v8.7 import and its key limits, wrong lecture (name, URL, legacy), smuggled foreign key, write failure at 3 positions with full rollback (including corrupted originals and removal of new keys), silently dropped write, quota on first write, blocked reads (no writes, no file), failed rollback reported, ink merge without loss or duplicates, corrupted existing ink blocks import, invalid imported values, export skips corrupted values, cancelled confirm, oversized file, invalid JSON, identical data, empty export.
- Mutation check (manual): removing rollback, write verification, the lecture check or ink de-duplication each makes at least one case fail.
- `python3 -I tests/step40_backup_browser.py` (headless Chromium, simulated server): 6 checks — 11 keys covered, export downloads 11 entries, import after wiping restores every key (ink compared after compact re-serialisation), other lecture untouched, no JS errors. The buttons are clicked by script because the ink panel covers the backup button (Step 41).
- Re-run after the change: npm test, step39_login_integration.py (29), v81_auth_smoke.py (45) — all PASS.

# Step 39 test results

## npm test (offline, no dependencies) — PASS
- 60 Study Suite storage runtime cases, 7 PDF search lifecycle cases, 14 mask storage cases: 81 passed, 0 failed (simulated, not a real browser).
- Inherited regression checks: Anki scheduler, recovery regression + 6 invariants, ink backup, responsive static audit, mask guards, 7 mask/quiz guards, notes and import guards, recovery references, data check (37 courses, 8 immunology study topics), required release files.
- Baseline: 91 educational/PDF/image/server files byte-identical to Step 32; 2 documented intentional server changes pinned by SHA-256.
- New in npm test: AUTH API OK, MIDDLEWARE OK, upload API 73 checks, KV adapter 19 checks.
- Syntax: 30 external JS files and 2 inline reader scripts.

## Browser tests (Playwright + headless Chromium, simulated server tests/dev_server.mjs) — PASS
- tests/step39_login_integration.py — 29 checks: login page renders with no JS errors at 390, 820 and 1366 px, no horizontal scroll, Google and guest buttons visible, login styles and hover transitions applied; simulated Google login accepted; "continue" goes to the requested Study Mode page; header shows the account; PDF reader renders pages and the study-tools button while signed in; logout ends the session and restores the guest header; seeded Step 38 study keys (study, annotations, masks with intentionally corrupt JSON, notes) are byte-identical after login, reader use and logout; Study Mode works as a guest.
- tests/auth_e2e.py — AUTH E2E OK: guest flow, offline-Google message, login, sync between two browser contexts, logout, roles, admin, announcements, upload by account, privacy/terms/contact.
- tests/v81_auth_smoke.py — 45 checks: 17 pages with no JS errors, account button on 4 pages, home sections, PDF reader raster fallback drawn, study panel opens.
- tests/upload_e2e.py — 33 checks; tests/upload_names_check.js — 24 checks; tests/redesign_check.mjs — 340 checks.

pdf.js and pdf-lib were served from local npm copies (MEDIXA_CDN_DIR) because the sandbox cannot reach cdnjs.

## NOT tested
Live Google Sign-In, real Cloudflare D1/KV, production deployment, iPad/Android hardware, stylus input, real network PDF loading. ui_check.py / phase1_check.py / parts of nav_check.py are legacy tests for the old homepage and were not run as pass criteria.
