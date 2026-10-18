# MEDIXA Study Tools — implementation status

This is an incremental local upgrade, not a production-ready complete medical study platform.

## Implemented in PDF reader
- Existing pen, highlighter, eraser, local strokes, PDF export (existing implementation; rotation accuracy not verified).
- Study Mask, manual flashcards, notes, manual MCQ creation (previous snapshot).
- Spaced repetition review queue (simple interval scheduling, not FSRS).
- Text-based concept map outlines linked to PDF pages (not graphical node editor).
- JSON export/import for study tools with ID-based merge (does not include ink strokes).

## Still required
- Secure student authentication and cloud synchronization; no provider credentials/config supplied.
- Offline PDF cache / service worker, image occlusion quizzes, text-to-flashcard selection, OCR, graphical concept map editor, split-screen, lasso, advanced Apple Pencil interaction.
- Browser and device testing, integration testing, security validation, export rotation verification.

Do not deploy as a completed product without tests.
