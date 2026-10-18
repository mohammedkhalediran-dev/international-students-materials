# Study data backup coverage (Step 40)

`R` = the reader's `?file=` value as written in the URL (or the page path). `A` = the absolute URL of that file.
"Unified" = the "⇩ نسخة احتياطية شاملة" button (`site/js/study-backup-v87.js`, export format `medixa-local-backup-v40`).

| Module | localStorage key | Unified backup (before Step 40) | Unified backup (Step 40) | Import behaviour | Own export |
|---|---|---|---|---|---|
| Study Suite v8.5 — split notes | `medixa.v85.R.splitNotes` | yes (prefix match) | yes (exact key) | replace | suite JSON |
| Study Suite v8.5 — split page | `medixa.v85.R.splitPage` | yes (prefix match) | yes | replace | suite JSON |
| Study Suite v8.5 — image quiz | `medixa.v85.R.imageQuiz` | yes (prefix match) | yes | replace | suite JSON |
| Study Suite v8.5 — quiz reviews | `medixa.v85.R.imageQuizReviews` | yes (prefix match) | yes | replace | suite JSON |
| Workspace v8.6 | `medixa.v86.workspace:R` | yes | yes | replace | workspace JSON |
| Timer v8.3 | `medixa.timer.v83:<file param>` | no (listed but never matched) | yes | replace | timer JSON |
| Goals v8.4 | `medixa.study.goals.v84:<file param>` | no (listed but never matched) | yes | replace | goals JSON |
| Cards / Anki (pdf-notes) | `medixa.study.v1:A` | no | yes | replace | study JSON |
| Reader bookmarks v5 | `medixa.reader.v1:A` | no | yes | replace | none |
| Image masks v9.0 | `medixa.occlusion.v1:A` | no | yes | replace | none |
| PDF ink (pdf-notes) | `medixa.pdf.annotations.v1:A` | no | yes | **merge** (adds strokes, never deletes, skips duplicates) | ink JSON (v8.9) |

## Deliberately excluded
- `medixa.penOnly` — a device setting (stylus only), not tied to one lecture.
- `medixa.v88.session:A` — temporary "resume where you stopped" state; restoring an old one would jump to a stale page.
- `ms.fav`, `ms.read`, `ms.last`, `ms.exam`, `ms.review`, `ms.study` — saved to the student's account when signed in (see AUTH-INTEGRATION.md).
- `ms.notes` and other site-wide keys — not tied to one PDF.
- The PDF file itself, other lectures' data, and anything on the server.

## Safety rules (tested in tests/backup-runtime.cjs, 19 cases, and tests/step40_backup_browser.py)
- Keys are matched exactly. Before Step 40, a prefix match meant lecture `a.pdf` could export or import Study Suite keys of a lecture named `a.pdf.<anything>`.
- A backup must name this lecture (`document`, and `documentUrl` in the new format). Keys from another lecture are rejected.
- Every current value is read before the first write. If storage cannot be read, nothing is written.
- Each write is read back. On any failure, every written key is restored to its exact previous bytes (including corrupted originals) or removed if it did not exist. A failed rollback is reported.
- New-format values must be valid JSON; ink must pass the same check as the ink backup. Corrupted existing ink blocks the whole import.
- Export never writes. Corrupted stored values are left out and counted in the message, not exported as if valid.
- Legacy `medixa-local-backup-v87` files still import, limited to the keys v8.7 exported (Study Suite's four keys and the workspace).
- Limits: file 12 MB, 40 entries, 6 MB per value.

## Not covered / known limits
- No atomic multi-tab guarantee: a module open in another tab can write after an import. Each module's own guards still apply (masks detect a changed value and refuse stale writes).
- Modules already open on the page keep their in-memory state; the student is told to reload after import.
- Backups stay on the device the student saves them to; nothing is uploaded.
