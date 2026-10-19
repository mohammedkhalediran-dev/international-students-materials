# Study Studio — storage inventory, migration and backup coverage

| Key | Scope | Written by | In unified backup (v40) | Migration / rollback |
|---|---|---|---|---|
| `medixa.pdf.annotations.v1:<abs>` | document | studio-ink | yes (merge, never deletes) | v1→v2 in memory; first edit persists ids; malformed kept; old code still reads it |
| `medixa.studio.layout.v1:<abs>` | document | studio-ink | yes (replace) | new; absent = no margins/blank pages |
| `medixa.study.v1:<abs>` | document | inline study script / MedixaStudyStore | yes | unchanged; new optional `source`, `explanation` |
| `medixa.occlusion.v1:<abs>` | document | study-occlusion-v90 | yes | unchanged |
| `medixa.reader.v1:<abs>` | document | study-mode-v5 | yes | unchanged |
| `medixa.notebooks.v1` | device | studio-tabs | no (list of notebooks) | new; notebook content is a normal document (its ink/layout/study keys ARE covered when that notebook is open) |
| `medixa.studio.tabs.v1`, `medixa.studio.split.v1`, `medixa.studio.toolbar.v1`, `medixa.studio.lasso.v1`, `medixa.penOnly` | device preferences | studio-* | no (deliberate) | new |
| `sessionStorage medixa.studio.hist.v1:<key>`, `…draft.v1:<abs>` | tab session | studio-ink / studio-smart | no | new, validated by fingerprint |
| IndexedDB `medixa-studio/drafts` | document | studio-ink (failed saves) | no | new; offered back on next load |

Failure handling verified in `studio_phase1_robust_browser.py`: quota error (previous valid data intact + durable draft), stale second tab (conflict reported, explicit merge keeps both), malformed legacy entry preserved, legacy v1 data rendered and not rewritten by loading alone.
Not verified: partial import rollback of the *new* layout key beyond `backup-runtime.cjs` (generic code path), real device storage limits.
