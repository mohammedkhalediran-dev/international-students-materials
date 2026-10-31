# Step 39 — next exact task

1. Resume this Step 38 complete archive and run `npm test`.
2. Inventory storage keys in `study-backup-v87.js`, `study-ink-backup-v89.js`, `study-suite-v85.js`, `study-workspace-v86.js`, `study-timer-v83.js`, `study-planner-v84.js`, `study-occlusion-v90.js`, `study-mode-v5.js` and `pdf-notes.html`.
3. Add an explicit backup-coverage matrix. Reuse the simulated-storage approach for same-document round-trip, legacy compatibility, wrong-document rejection, partial-write rollback, quota and corrupted-existing-data tests.
4. Extend unified backup incrementally without migrating/deleting student keys or replacing modules with old v8.7 files. Document any excluded PDFs, settings, cross-document or cloud data.
5. Run relevant tests, update these documents, export and verify a complete MEDIXA-Step-39.zip, then continue.

Constraints: no GitHub/main changes, deployment or production Firebase configuration. Do not repeatedly attempt unavailable browsers/devices. Real browser/PDF/mobile testing remains pending. Always export a complete checkpoint before stopping.
