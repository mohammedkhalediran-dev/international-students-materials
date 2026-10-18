# Step 41 — next exact task

1. Resume from MEDIXA-Step-40.zip and run `npm test`, then the browser checks (step39_login_integration.py, step40_backup_browser.py) when Playwright is available.
2. On site/pdf-notes.html the floating tools overlap: the ink-backup panel (v8.9) covers the unified backup button; on phones the timer, workspace, Study Mask bar, page navigation and recovery diagnostics stack on top of each other.
3. Add one bottom dock that holds these existing controls (move the elements, keep their handlers and storage untouched), turn the always-open ink panel into a button + popup, keep popups above the dock, and add page padding so the last PDF page is not hidden.
4. Verify in headless Chromium at 390, 820 and 1280 px that every control is clickable (no element covers another) and still works; switch step40_backup_browser.py back to real clicks.
5. Update docs, export and verify MEDIXA-Step-41.zip, then continue with the remaining Study Mode items.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
