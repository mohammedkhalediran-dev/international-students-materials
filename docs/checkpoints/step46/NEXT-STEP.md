# Step 47 — next exact task

1. Resume from MEDIXA-Step-46.zip; run `npm test` and the browser checks (step39–46, v81_auth_smoke, auth_e2e, upload_e2e) with MEDIXA_CDN_DIR.
2. Waiting on Mohammed: docs/proposals/study-cloud-backup.md (server storage of study data). Do not build it without his answer.
3. Next local item: the rewrite of the legacy UI tests (ui_check.py, phase1_check.py, parts of nav_check.py) that still target the pre-v8.1 homepage, so the old checks (i18n completeness, design-system rules) run again on the current pages.
4. Then real-device checks when an iPad is available: Safari safe-area and the dock, Apple Pencil drawing, offline reader.
5. Update docs, export and verify each checkpoint.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
