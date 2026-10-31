# MEDIXA — Claude merge guide

Source: medixa-study-tools-v2.zip. This is an additive enhancement package, not a replacement for Claude authentication and cloud progress.

## Changes
- site/pdf-notes.html: adds study dashboard styling and loads enhancement module.
- site/js/study-enhancements.js: live counts for flashcards, due reviews, MCQs, notes, concept maps and study masks; filter saved study items; graphical SVG previews for text concept maps; Escape closes panel.
- Existing PDF pen, highlighter, eraser, mask, spaced repetition, MCQ, local notes, JSON backup retained.

## Merge safely
1. Preserve Claude's authentication, database configuration and student progress sync.
2. Review diffs for site/pdf-notes.html rather than overwriting Claude's version.
3. Add site/js/study-enhancements.js and the associated style/script integration.
4. Existing storage key is medixa.study.v1:<absolute PDF URL>; do not change without migration.
5. No cloud sync added. JSON backups do not contain ink strokes.

## Not yet implemented / not verified
OCR, image quiz, offline PDF cache, full graphical drag-and-drop editor, lasso selection, split screen, Apple Pencil native gestures, multi-device sync and automated browser/device tests.
