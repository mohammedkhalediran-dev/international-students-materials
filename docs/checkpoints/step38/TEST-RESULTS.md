# Step 38 test results — 2026-10-18

## Executable simulated runtime tests
Command: `npm test` (no dependency installation required).

- PASS `node --test tests/suite-storage-runtime.cjs`: 60 cases. Real Study Suite handlers in a minimal DOM fixture: backup validation/import/rollback, quota and blocked storage, silent write failures, corrupt data preservation, autosave, per-page unsaved drafts, retry/unload warnings, quiz edits and scoring.
- PASS `node --test tests/suite-search-runtime.cjs`: 7 cases. Controlled PDF.js stub: escaped output, failure cleanup, concurrent searches, cancellation, delayed load completion, tab changes and Escape.
- PASS `node --test tests/mask-storage-runtime.cjs`: 14 cases. Actual Study Mask script: malformed JSON/schema/geometry, oversized collections, read/quota/drop failures, in-memory rollback, existing metadata and changed data from another tab.
- Total: **81 passed, 0 failed** in the new runtime suites. These are simulated integration tests, not real browser tests.

## Existing regression checks
- PASS Anki scheduler (10 assertions), session recovery regression and 6 restoration invariants, ink backup regression.
- PASS static responsive audit, mask safety guards, 7 mask/quiz link guards, suite import and note guards, recovery script references, required release files.
- PASS data check: 37 courses and 8 immunology study topics.
- PASS syntax: 25 external JS files and 2 inline PDF-reader scripts.
- PASS SHA-256 comparison: 93 original educational/PDF/image/server files unchanged from Step 32.
- PASS baseline inventory: every original Step 32 file retained.
- PASS ZIP export: CRC validation and byte comparison for every packaged project file.

## Evidence and limits
Prior checkpoint reports are retained in docs/checkpoints/. Tests exposed schema validation, lost drafts, quiz data overwrite, stale search results/resource cleanup, and malformed mask overwrite errors; fixes are covered by the runtime cases. Quiz fixtures clone per-case input to prevent cross-test pollution.

NOT RUN: real browser/PDF rendering, Android/iPad hardware, stylus input, live Firebase/Cloudflare and production deployment. No repeated browser/device installation or testing attempts. A pending cancelled PDF load is released when it settles; pending network transfer is not aborted. Unsaved drafts live in memory only. No atomic multi-tab storage guarantees.
