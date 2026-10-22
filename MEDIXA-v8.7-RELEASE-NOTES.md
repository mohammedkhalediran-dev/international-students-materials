# MEDIXA v8.7 — Study Backup Preview

Based on v8.6. Adds a unified per-document JSON export/import for local v8.5 and v8.6 study workspace keys. Import validates file format, document identity, key names and sizes; asks for confirmation before overwriting; attempts rollback on storage errors. Does not back up older tool data, v8.3 timer, v8.4 planner, Firebase, or uploaded PDFs. No server writes.

Validation: JavaScript syntax checked and ZIP integrity checked. No browser/mobile end-to-end testing. This is not production-ready and does not solve OCR, new PDF conversion, offline synchronization, or cloud persistence.
