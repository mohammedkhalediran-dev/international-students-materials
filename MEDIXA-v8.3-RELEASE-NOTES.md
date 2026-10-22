# MEDIXA v8.3 — Study Timer Preview

Built on the v8.2 study mode preview. Existing study tools retained without changing the PDF rendering engine.

## Added
- Persistent, per-PDF Pomodoro timer (focus / short break / long break).
- Configurable intervals, start/pause/resume/reset, floating countdown.
- End-time based countdown remains accurate across browser tab suspension/reload (subject to device clock).
- Local completed-session count, study minutes and downloadable JSON history (last 100 sessions).
- Optional low-distraction focus mode; optional system notification only if permission is already granted.

## Previously available, retained
Pen, highlighter, eraser, PDF notes, masks, manual flashcards, MCQs, review scheduling, text concept maps, local study backup, page navigation.

## Important limitations
- This is NOT complete cloud-synced production Study Mode. Authentication, secure cloud persistence and Firebase integration are not included in this ZIP.
- New PDF rasterization after admin upload is not implemented; the previous static fallback remains limited.
- Timer history and study tools are local to the current browser; they may be lost if browser storage is cleared.
- Browser/device end-to-end validation has not been completed. Do not deploy without testing.
- No changes made to GitHub main or Cloudflare.
