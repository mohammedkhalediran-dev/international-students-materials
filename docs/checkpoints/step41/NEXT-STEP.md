# Step 42 — next exact task

1. Resume from MEDIXA-Step-41.zip; run `npm test` and the browser checks (step39/40/41 + v81_auth_smoke) when Playwright is available.
2. Concurrency audit (open item since Step 38): for each study module that writes localStorage (v83 timer, v84 goals, v85 suite, v86 workspace, v5 reader, pdf-notes ink and cards), check whether a second tab with older in-memory state can overwrite newer data. Use the Step 38 mask approach (remember the last value read; refuse to write if storage changed; tell the student to reload) where a silent overwrite is possible. Add simulated two-tab tests.
3. Do not change storage keys or formats. Update docs, export and verify MEDIXA-Step-42.zip, then continue.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
