# MEDIXA Study Mode v5 — integration instructions

Base: v4 Anki archive. Preserve Claude authentication and cloud progress code.

## Changes
- `site/pdf-notes.html`: new line, rectangle and ellipse annotation tools, integrated additive reader assets.
- `site/js/study-mode-v5.js`: page thumbnails, bookmarks, last-read page, dark mode, focus mode, page navigation, same-origin PDF split view.
- `site/css/study-mode-v5.css`: responsive styling for new controls.
- All prior Anki and Study Tools files retained.

## Integration
Copy these three files into Claude's current project, inspect and merge changes to `pdf-notes.html` rather than overwriting its authentication or progress additions. Reader bookmarks currently use localStorage per document; wire them to the cloud profile if desired. PDF.js and pdf-lib still load from CDNs; full offline reading is NOT supported yet. The split view is an iframe and should be evaluated on tablets. Pressure sensitivity, palm rejection, Lasso, OCR, image quizzes, and zoom writing are not yet implemented. Do not claim feature parity with Goodnotes.
