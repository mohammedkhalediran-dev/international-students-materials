# Acceptance checklist — CLAUDE-CODE-PROMPT.md (FEATURE-SPECIFICATION.md was not supplied; this maps the brief's own bullets)

Status: ✅ implemented + browser/unit evidence · 🟡 implemented, partly verified · ⛔ not done / blocked.

## Phase 1 — ink engine
- ✅ pen / highlighter / stroke eraser on shared vector data; Pointer Events, capture, one active pointer, coalesced events with fallback; pressure 0 valid, mouse constant 0.5 (studio_phase1_robust)
- ✅ stylus-only mode still scrolls with touch; 🟡 no palm-rejection claim; real Apple Pencil not tested
- ✅ incremental smoothing (quadratic midpoints, raw samples kept), rAF painting, no full serialisation per move
- ✅ highlighter does not darken on overlap (single path); freehand vs text-anchored highlight are different types
- ✅ one gesture = one undo command (erase, shapes, transforms); history bounded by dropping oldest steps only
- ✅ states editing/pending/saved/failed/conflict; flush on gesture end, visibility, pagehide; failed drafts in IndexedDB; two-tab conflict + explicit merge
- ✅ legacy v1 data renders, deterministic ids, malformed kept; backup round trip (backup-runtime 19)
- ✅ gate: real PDF → draw, save, reload, reopen, export, reopen export independently (mixed size / rotation / CropBox, DPR 1 and 2); exact colour checked

## Phase 2 — annotation tools
- ✅ lasso (mixed objects, types filter, move/resize/duplicate/delete/keyboard nudge, one command, undo after transform)
- ✅ Zoom Writing ×2/3/4/6, target outline, auto-advance, new line, clamped, restored after viewport change; ink lands at mapped page coordinate
- ✅ line/rectangle/ellipse with angle snap; text and sticky (Arabic multiline, edit by double click, export as exact raster)
- ✅ custom toolbar (order, visibility, reset, left-handed, compact overflow, active tool always visible, 44 px targets, accessible names)
- 🟡 touch/pen on real hardware not available; Chromium 141 CDP pen/touch only

## Phase 3 — workspace
- ✅ shell: slim header + floating task toolbar + side panels + dock; v5 reader bar relocated, links/query unchanged (pdf-notes.html?file=)
- ✅ margins (virtual, no stretch, shrink-protected, clipped vs expanded export with warning, original bytes untouched)
- ✅ blank pages (stable ids), independent notebooks (ink + text, templates, export); ⛔ reordering of *source* pages (deliberately not offered)
- ✅ split view (PDF+notebook or two documents, divider pointer/keyboard, min sizes, independent state, narrow switcher, persisted)
- ✅ tabs (independent store/history/position, dirty marker, recoverable close); 🟡 tabs are navigation, not parallel live documents
- ✅ lazy render + release, cancel obsolete renders, 120-page lecture (load 2 s, ≤ 13 rendered pages, heap 10 MB in headless Chromium here); thumbnails lazy
- ✅ focus mode keeps toolbar, save status, page controls, obvious exit (Esc); safe-area insets, reduced motion, RTL
- 🟡 performance on named real devices not measured

## Phase 4 — smart study layer
- ✅ highlight → flashcard (real selection, source anchor, existing store + scheduler, exact source return, changed/missing source messages)
- ✅ highlight → MCQ (exactly one correct, distinct options, explanation, citation); manual drafting; AI marked unavailable, nothing sent anywhere
- ✅ study masks in page coordinates (margins, rotation), reveal each/all, source link; not described as redaction
- ✅ scanned pages: honest "no text" message, region cards/masks without invented text
- 🟡 high-yield bookmarks / planner / shared question bank: existing modules untouched; no shared-bank publishing added (personal drafts only)
- ✅ account isolation unchanged (local stores keyed by document; no new cross-user store)

## Not done / blocked
- Real Apple Pencil / iPad / Android testing; real Cloudflare deployment; live account sync of the new stores.
- Text in exported PDFs is an image (not selectable) for typed notes.
