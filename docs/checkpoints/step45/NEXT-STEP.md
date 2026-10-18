# Step 46 — next exact task

1. Resume from MEDIXA-Step-45.zip; run `npm test` and the browser checks (step39–45, v81_auth_smoke, auth_e2e, upload_e2e) when Playwright is available (MEDIXA_CDN_DIR for pdf.js).
2. Text-to-flashcard: in the PDF reader, let the student turn PDF text into a card without retyping. When pdf.js is available, read the page's text (getTextContent) for the current page, show it in the card panel as a selectable list of sentences, and prefill the card question/answer from the chosen sentence. Use the existing card storage (medixa.study.v1) through the Step 42 guard; no new keys. Hide the feature with a short note when only page images are available (Step 43).
3. Tests: runtime test for sentence splitting (Arabic and English punctuation), headless-Chromium test that a sentence from page 2 becomes a saved card.
4. Update docs, export and verify MEDIXA-Step-46.zip, then continue.

Constraints unchanged: no GitHub/main changes, deployment or production Google/D1/Firebase configuration. Keep the login integration and all student storage keys.
