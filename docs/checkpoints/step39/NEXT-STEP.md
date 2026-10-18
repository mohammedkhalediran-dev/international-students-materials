# Step 40 — next exact task

1. Resume from MEDIXA-Step-39.zip and run `npm test` (plus `python3 -I tests/step39_login_integration.py` when Playwright is available).
2. Inventory storage keys in study-backup-v87.js, study-ink-backup-v89.js, study-suite-v85.js, study-workspace-v86.js, study-timer-v83.js, study-planner-v84.js, study-occlusion-v90.js, study-mode-v5.js and pdf-notes.html.
3. Add an explicit backup-coverage matrix and simulated-storage tests: same-document round-trip, legacy compatibility, wrong-document rejection, partial-write rollback, quota and corrupted existing data.
4. Extend unified backup incrementally without migrating or deleting student keys. Document excluded data (PDFs, settings, cross-document, account-synced ms.* keys).
5. Update docs, export and verify MEDIXA-Step-40.zip, then continue.

Keep the login integration intact (AUTH-INTEGRATION.md). Constraints: no GitHub/main changes, deployment, or production Google/D1/Firebase configuration. Real browser/PDF/mobile testing remains pending.
