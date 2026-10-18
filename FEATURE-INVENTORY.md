# MEDIXA Advanced Study Mode — Step 38 inventory

## Retained from authoritative Step 32
- PDF reader, pen/highlighter/eraser/shapes, annotation export and original study tools: `site/pdf-notes.html`, `study-mode-v5.js`, `study-mode-v6.js`.
- Anki scheduler, Pomodoro, planner, bookmarks, recovery, ink backup and existing unified backup modules.
- Study Suite page notes, split view, selectable PDF text search and image questions with optional mask references and text-answer scoring.
- Standalone Study Mask rectangles, pointer cancellation and reveal/hide controls.
- All course/lecture content, original PDF files and artwork.

## Hardened and runtime-tested in Steps 33–38
- Backup schema validation and best-effort verified rollback, with exact original-byte preservation.
- Autosave read/write validation, per-page failed drafts, explicit retry and unload warning.
- Quiz creation/deletion/scoring preservation under corrupt data and storage failures.
- Search cancellation, stale-result suppression and loaded-document cleanup.
- Mask invalid-data preservation, write verification and detection of already-changed cross-tab data.
- 81 executable simulated cases and one-command `npm test` runner.

## Partial / missing / unverified
- Full backup coverage across all modules is the next task; existing v8.7 backup is not a complete project/data backup.
- Highlights-to-flashcards, graphical concept editing, MCQ review, lecture mastery and offline capabilities still require functional auditing.
- OCR/new PDF conversion, reliable cloud/multi-device synchronization and full stylus/palm-rejection support are incomplete or unverified.
- Real browser/PDF rendering and physical mobile/pen testing remain pending. Simulated tests do not establish browser layout, performance or production readiness.
