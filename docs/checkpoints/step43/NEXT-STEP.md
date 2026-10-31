# Step 44 — next exact task

1. Resume from MEDIXA-Step-43.zip; run `npm test` and the browser checks (step39–43, v81_auth_smoke, auth_e2e) when Playwright is available.
2. Study progress across devices: Study Mode data (cards, ink, notes, masks, goals) is local to each device; only ms.* progress is synced to the signed-in account. Design (do not build yet without the owner's decision) an opt-in per-lecture cloud backup that reuses the existing Google login + D1: size limits, privacy wording, conflict rule, and what happens on logout. Write it as a short proposal in docs/proposals/ with the open questions for Mohammed, because it changes what is stored on the server.
3. Meanwhile pick a local-only improvement: show a per-lecture "study summary" (cards due, notes count, ink pages, last studied) on course.html from existing local keys, read-only, no new keys.
4. Update docs, export and verify MEDIXA-Step-44.zip.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
