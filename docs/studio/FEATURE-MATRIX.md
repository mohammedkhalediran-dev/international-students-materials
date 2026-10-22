# Study Studio Pro — feature matrix (Gate 0 inventory, updated at the end of the work)

Baseline: `origin/cloudflare-upload` @ a23c69f (Step 58). `npm test` passed before any change. Chromium 141 / Playwright 1.56 (see TEST-RESULTS.md).

| Feature | Owner before → after | Data key / schema | Evidence | Gap / limit |
|---|---|---|---|---|
| Pen, highlighter, stroke eraser | inline script in pdf-notes.html → `studio-ink.js` (one engine) | `medixa.pdf.annotations.v1:<abs url>`; v1 `{page,tool,color,width,points:[[u,v]]}`; v2 adds `id,rev,v,pr` (pressure) | studio_phase1_browser (34), studio_phase1_robust_browser (17), browser_dom_ink, step42 | Real Apple Pencil / palm rejection not testable here (CDP pen/touch simulation only) |
| Undo/redo | one `History` (studio-core) | in memory + `sessionStorage medixa.studio.hist.v1:<key>` (fingerprint-checked) | phase1, workspace tests | history is per browser tab session |
| Persistence / recovery | `MedixaGuard` (step 42) + IndexedDB `medixa-studio/drafts` for failed writes | same ink key; draft store | phase1_robust (quota, two tabs, merge) | localStorage has no compare-and-swap; two tabs writing in the same instant can still race (narrowed, reported) |
| PDF export | pdf-lib raster overlay → vector paths (`drawSvgPath`), CropBox + /Rotate aware, text via canvas raster | — | phase1 (rotated/cropped pages reopened), phase2, margins, pages | Text/sticky are raster images in the PDF (exact Arabic shaping, not selectable) |
| Lasso, shapes, text, sticky, Zoom Writing | `study-mode-v6.js` (removed) → `studio-tools.js` | same ink key (`tool: text/sticky/line/rectangle/ellipse`, `text,w,h,size,fill`) | studio_phase2_browser (49) | — |
| Toolbar | header buttons → `studio-toolbar.js` | `medixa.studio.toolbar.v1` (order, hidden, side) | phase2 | — |
| Reader | inline loop → `studio-reader.js` (lazy render/release, CSS zoom) | — | studio_phase3_browser (120-page fixture), step43/45 offline | Performance numbers are headless-Chromium in this container only |
| Margins | new | `medixa.studio.layout.v1:<abs>` `{margins:{pageId:{l,t,r,b}}}`; ink u,v may be <0 or >1 | studio_phase3_margins_browser (18) | Margins never shrink below existing writing |
| Blank pages / notebooks | new | layout `blanks`+`order` (ids ≥ 100001); notebooks = document `notebook:<id>`, index `medixa.notebooks.v1` | studio_phase3_pages_browser (27) | Source PDF pages cannot be reordered (by design); blank page delete is not undoable |
| Tabs | new (navigation based) | `medixa.studio.tabs.v1` `{open,closed,pos}` | studio_phase3_workspace_browser (35) | one document per browser tab; tabs are not live iframes |
| Split view | v5 prompt+iframe → `studio-split.js` | `medixa.studio.split.v1` | workspace test | second pane is a full reader (own toolbar); same document in both panes refused |
| Focus mode | v5 class → CSS + status chip | — | workspace test | — |
| Pages panel / bookmarks | v5 thumbs → `studio-panels.js` (v5 bookmark list relocated, same store `medixa.reader.v1`) | existing | phase3 | — |
| "ملاحظاتي" | new, read-only view of text/sticky annotations | from ink store | phase3 | no tags/categories (not in data) |
| Text-anchored highlight | new | ink `tool:'texthl'` `{rects,quote}` | studio_phase4_browser (44) | needs pdf.js text; none on scans |
| Highlight → card | new (adds `source` anchor) | `medixa.study.v1:<abs>`.cards + `source{documentId,documentVersion,pageId,rects,quote}` | phase4, scheduler untouched | — |
| Highlight → MCQ | new, manual drafting | `.quiz` + `explanation`, `source` | phase4 | AI generation not configured → shown as unavailable |
| Study masks | v90 (kept) + `add()` + page-area coordinates | `medixa.occlusion.v1:<abs>` | phase4 (margin + rotation), mask unit tests | a mask is a study aid, not redaction |
| Unified backup | v87 | now 12 keys per document (+layout) | backup-runtime 19, step40 | notebook index/tabs/split/toolbar are device settings, not in the per-lecture backup |
