# MEDIXA v7 — targeted Zoom Writing fix

Based on the user-confirmed working v6 ZIP. No production deployment.

- Zoom Writing now preserves multiple independent pen strokes instead of joining them into one continuous line.
- Each stroke is saved as a separate PDF ink item, so undo and export continue to use the existing data format.
- Pen-only mode applies to the zoom canvas, and pointer capture prevents losing strokes when the pointer leaves the pad.
- Zoom canvas can now save single-point pen marks; coordinates are clamped to the page.
- Clear and commit reset the in-progress stroke state.

This is a focused fix, NOT a full Goodnotes implementation. Cloud sync, pressure sensitivity, multi-object lasso, OCR, image occlusion and offline functionality remain unimplemented/unverified.

Test locally using python -m http.server 8000 inside site/. Open a PDF through the site, choose Zoom Writing, draw separate letters, commit, refresh, and verify that all letters remain separate.
