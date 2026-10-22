# Study storage safety: two tabs and corrupted data (Step 42)

Problem found in the audit: several modules read their data once when the PDF reader opens, keep it in memory, and later write the whole value back. If the same lecture is open in two tabs (or a backup is imported in the same tab), the tab with older data silently replaced newer work on its next save. Two of them also replaced data they could not parse with an empty value on the next edit.

Fix: `site/js/study-storage-guard.js` (`MedixaGuard.open`). A guarded module remembers the exact value it last read or wrote. Before each save it checks storage still holds that value; if not, it refuses and tells the student to reload. Unparseable or wrong-shape stored data is never overwritten. Every write is read back and the previous bytes are restored on mismatch.

| Module | Key | Before Step 42 | Step 42 |
|---|---|---|---|
| PDF ink (pdf-notes) | `medixa.pdf.annotations.v1:A` | stale tab overwrote; corrupt data replaced by `[]` on next stroke | guarded (status line explains) |
| Cards / notes / quiz / maps (pdf-notes) | `medixa.study.v1:A` | stale tab overwrote; corrupt data replaced on next edit | guarded (alert explains) |
| Quick tools workspace v8.6 | `medixa.v86.workspace:R` | stale tab overwrote | guarded (alert once) |
| Goals v8.4 | `medixa.study.goals.v84:<file>` | stale tab overwrote | guarded (status line) |
| Study Suite v8.5 | `medixa.v85.R.*` | already re-reads storage before every edit (Step 36) | unchanged |
| Image masks v9.0 | `medixa.occlusion.v1:A` | already detects changed values (Step 38) | unchanged |
| Timer v8.3 | `medixa.timer.v83:<file>` | last writer wins | unchanged — timer state, low value, saves often |
| Reader bookmarks v5 | `medixa.reader.v1:A` | last writer wins | unchanged — bookmarks and last page; documented limit |
| Session recovery v8.8 | `medixa.v88.session:A` | verified writes | unchanged |

Storage keys and formats are unchanged.

## Limits
- localStorage has no compare-and-swap: two tabs saving in the same instant can still race (the window is one synchronous read-then-write).
- After a conflict the newer work in the stale tab stays on screen but is not saved; the student must reload (export or copy first if needed).
- Goals v8.4 still keeps only the latest 100 goals and 100 logs when it loads (existing behaviour, not changed).

## Tests
- `tests/storage-guard-runtime.cjs` (13 cases, in npm test): corrupt and wrong-shape values, unreadable storage, two simulated tabs, same-tab backup import, deleted key, quota, dropped write with restore, blocked read at save time, messages.
- `tests/step42_two_tab_browser.py` (headless Chromium, two pages sharing localStorage, 15 checks): ink, cards and workspace bookmarks from a stale tab do not overwrite the other tab; the stale tab tells the student; the current tab keeps saving; after reload saving works; corrupted ink and cards stay byte-identical after drawing and adding a card.
