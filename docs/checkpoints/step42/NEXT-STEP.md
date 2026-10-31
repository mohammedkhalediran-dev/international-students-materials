# Step 43 — next exact task

1. Resume from MEDIXA-Step-42.zip; run `npm test` and the browser checks (step39–42, v81_auth_smoke, auth_e2e) when Playwright is available.
2. Uploaded lectures in the PDF reader: the raster fallback (site/pdf-raster/) only covers 4 bundled PDFs. When pdf.js cannot load (CDN blocked), lectures uploaded later show an error. Make that failure clear and recoverable: explain in Arabic, offer "open the PDF directly" and "retry", and keep study tools that do not need rendered pages usable. Do not add network calls to new hosts.
3. Add headless-Chromium tests with the CDN blocked for a bundled and a non-bundled PDF.
4. Update docs, export and verify MEDIXA-Step-43.zip, then continue.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
