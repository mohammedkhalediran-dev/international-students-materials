# Step 45 — next exact task

1. Resume from MEDIXA-Step-44.zip; run `npm test` and the browser checks (step39–44, v81_auth_smoke, auth_e2e) when Playwright is available.
2. Offline reader for every lecture: site/sw.js ignores cross-origin requests, so pdf.js, its worker and pdf-lib from cdnjs are never cached; offline, only the 4 lectures with page images open (Step 43). Cache exactly the three pinned cdnjs URLs used by pdf-notes.html (cache-first, allow-list only, CORS responses with status 200), keep everything else unchanged, and bump the cache version.
3. Test in headless Chromium: visit the reader online once, then block the network (context.set_offline) and confirm a non-bundled lecture that was opened before still renders with pdf.js; confirm a never-opened lecture shows the Step 43 message.
4. Update docs, export and verify MEDIXA-Step-45.zip, then continue.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
