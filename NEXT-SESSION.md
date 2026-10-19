# NEXT-SESSION — Study Studio Pro (brief: CLAUDE-CODE-PROMPT.md, prototype: index-8.html + design PNG)

Branch: `ccr-a0fcdb08-bz6oce` (from origin/cloudflare-upload @ a23c69f). Never push to production/main without the owner.

## Done (Phase 1 — ink engine, checkpoint committed)
- `site/js/studio-core.js` (pure logic, `tests/studio_core_check.cjs` 39 checks) and `site/js/studio-ink.js` (the ONE engine).
- pdf-notes.html now delegates ink to `MedixaStudio` (old inline engine and study-mode-v6 lasso/zoom UI removed; Phase 2 re-provides them).
- Storage key + stroke shape unchanged (`medixa.pdf.annotations.v1:<abs url>`, `{page,tool,color,width,points:[[u,v]]}`), v2 adds `id/rev/v/pr`. Legacy data renders, migrates in memory with deterministic ids, malformed entries preserved verbatim.
- Coordinates: canonical = normalized u,v of the upright displayed page (pdf.js viewport: /Rotate + CropBox). Export is vector (pdf-lib `drawSvgPath`) with `viewToPdf`; verified by reopening the exported PDF on rotated/cropped pages.
- Tests (need `MEDIXA_CDN_DIR` = npm-packed pdfjs-dist-3.11.174 + pdf-lib-1.17.1, Playwright 1.56 for the installed Chromium 1194; `ln -s /opt/pw-browsers/chromium-1194/chrome-linux/chrome /usr/bin/chromium` for the old browser_dom_* tests):
  `python3 -I tests/studio_phase1_browser.py` (32), `tests/studio_phase1_robust_browser.py` (17).

## Done (Phase 2 — committed)
- `studio-tools.js` (lasso: select/move/resize/duplicate/delete/arrow-nudge/type filter; text + sticky with Arabic multiline, edit via dblclick; Zoom Writing strip with target region, ×2/3/4/6, direction, auto-advance, new line), `studio-toolbar.js` (config order/visibility/left-handed/reset, compact overflow, active tool always visible), `studio-shell.js` (relocates v5 reader-bar buttons into the header; the floating toolbar sits under it).
- Test: `python3 -I tests/studio_phase2_browser.py` (49 checks incl. export of text on rotated/cropped pages).
- Not verifiable here: real Apple Pencil / touch hardware (only Chromium CDP pen+touch simulation).

## Done (Phase 3 — committed)
- `studio-reader.js` (lazy per-page render/release, bounded memory, CSS zoom, 120-page lecture OK), `studio-panels.js` (pages thumbnails + bookmarks relocation + blank-page controls; "ملاحظاتي"), `studio-tabs.js` (tabs by navigation: per-doc store/history(sessionStorage)/position, dirty marker, recoverable close, notebook creation, lecture picker), `studio-split.js` (iframe pane `?embed=1`, divider pointer+keyboard, min sizes, narrow switcher), margins (engine `ext`, layout store `medixa.studio.layout.v1:`, clipped vs expanded export), virtual blank pages (ids >= 100001, `displayOrder`), notebooks (`file=notebook:<id>`, index `medixa.notebooks.v1`), focus mode CSS, compact header.
- Tests: `studio_phase3_browser.py` (30), `_margins_` (18), `_pages_` (27), `_workspace_` (35), core unit (48).
- Known limits: source PDF pages cannot be reordered (by design: ids never reassigned); blank page delete is not undoable; split pane has its own toolbar (no shared toolbar); the second pane can't hold the same document.

## Next
0. (old list below; Phase 2 items done)
1. Phase 2: lasso (events `gesture` on the engine, hooks in studio-ink.js), Zoom Writing, shapes snap UI, text/sticky editing UI (export already handles text via canvas raster), custom toolbar. Pen-only checkbox UI (engine API `setPenOnly`).
2. Phase 3: shell per design (css/studio.css), margins, blank pages, split view, tabs, focus mode.
3. Phase 4: smart study layer (reuse `medixa.study.v1:` cards + anki scheduler; masks `medixa.occlusion.v1:`).
4. Unified backup (study-backup-v87.js) already covers the ink key; update coverage for any NEW key.
Known unrelated: tests/nav_check.py fails on index.html (myCourseDialog intercepts click) — not caused by this work.
