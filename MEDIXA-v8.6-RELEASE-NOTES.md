# MEDIXA v8.6 — Local Study Workspace Preview

Built on the exact local v8.5 project. Existing v8.5 study suite, v8.4 plans, v8.3 Pomodoro and older PDF tools retained.

## Implemented in v8.6
- Quick-actions panel (keyboard Ctrl/Cmd + Shift + K).
- Page bookmarks with labels and direct navigation.
- Automatically remembered last-read PDF page and resume action.
- Simple daily review queue, with answer reveal and 1/3/7-day scheduling (not FSRS/Anki).
- Export/import JSON backup of v8.6 bookmarks, reviews and last page, per document.
- Local storage failure warning, limited import validation and mobile-sized UI.

## Verification
- `node --check` passed for v8.6 JS.
- Referenced script included in pdf-notes.html; ZIP archive verified.
- No end-to-end browser/mobile test was completed.

## Not yet implemented or proven
- Firebase/cloud sync, secure authentication, reliable multi-device offline mode, OCR, automatic conversion of newly uploaded PDFs, true image occlusion, production-ready stylus palm rejection, FSRS scheduling, or full integration of all 15 design concepts.
- Local data is per browser and can be lost when storage is cleared. JSON backup covers only v8.6 workspace data; older tool data remains separate.
- This preview must not be published to students without manual/browser testing and a security/privacy review.

No GitHub, Cloudflare or Firebase changes made.
