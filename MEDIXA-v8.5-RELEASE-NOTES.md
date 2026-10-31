# MEDIXA v8.5 — Study Suite Preview

Built on the local v8.4 preview. Added a reader-side study suite with per-document page notes, responsive split view, page-linked image-identification questions (manual questions and answers, no image occlusion), PDF.js text search for selectable text, per-document mini dashboard, and separate JSON export/import. Existing tools and timer retained.

## Verification
- New JavaScript passes `node --check`.
- Static references to new JS and CSS verified.
- No complete real-browser/mobile test or Firebase/cloud integration performed.

## Important limitations
- The image quiz links to the PDF page; it does not automatically mask regions, recognize anatomy, or evaluate image labels.
- Text search is not OCR; scanned PDFs need a separate OCR service.
- Notes, quizzes and timer remain browser-local. No Firebase sync, multi-device offline sync, automatic PDF rasterization, secure auth, or production-readiness claim.
- This preview is not deployed to GitHub/Cloudflare.
- Do not publish to students until end-to-end, mobile, authentication, privacy and security checks are complete.
