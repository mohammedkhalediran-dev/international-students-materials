# MEDIXA v8.2 — Study Mode Preview

Based on the original v8.1 archive, without v9/v10 homepage changes.

## Added
- Floating page navigation with previous/next and direct page entry.
- Study tools shortcut in the reader.
- Keyboard PageUp/PageDown shortcuts (disabled while typing).
- Escape closes the study tools panel.
- Page navigator initializes as pages load, with no polling or animation.

## Retained
- Original PDF.js renderer and v8.1 raster fallback, annotation, zoom writing, flashcards, MCQs, notes, masks, and local backup.

## Known limitations / launch blockers
- v8.1 raster fallback only covers four preprocessed lectures, not arbitrary uploaded PDFs.
- Study data and annotations are stored locally in the browser, not Firebase-synced.
- PDF rendering may still be heavy for large documents; no claim of full mobile performance testing.
- This preview is not a production-ready release until authenticated student access, uploads, persistence and real-device testing pass.

## Preview
From the extracted folder run: `cd site && python -m http.server 8000`, then open http://localhost:8000/ . Use a lecture's PDF annotation link to test the new navigation.

## Safety
No GitHub commits, Firebase changes, or Cloudflare deployment performed.
