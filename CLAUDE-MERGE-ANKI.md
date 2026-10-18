# MEDIXA — Anki-style review integration

This archive is based on medixa-study-tools-v3.zip. No authentication, user accounts, GitHub deployment, or Cloudflare configuration was changed.

## Changed files
- `site/pdf-notes.html`: review tab shows one due card at a time with Again/Hard/Good/Easy; displays review counts and next interval.
- `site/js/anki-scheduler.js`: new standalone Anki-inspired SM-2 scheduler with new, learning, review states, and due timestamps.
- `tests/anki_scheduler_check.cjs`: deterministic scheduling assertions.

## Merge instructions for Claude
Merge the changes into the existing PDF study-tools component without replacing existing authentication or cloud-progress sync. Existing card storage key remains `medixa.study.v1:<absolute PDF URL>`. Scheduler extends card objects in place using `srsState`, `interval`, `due`, `ease`, `repetitions`, `lapses`, `reviews`, `lastReviewed`, and `lastRating`. Legacy cards are supported. If syncing cards to Firebase, ensure these scheduling fields are included and merged per user.

This is Anki-inspired SM-2 scheduling, **not** Anki's FSRS algorithm, and does not promise exact Anki schedule parity. Learning steps are 1 minute (Again), 6 minutes (Hard), 10 minutes (Good on new), and graduation to 1 or 4 days. No push notifications or cross-device synchronization were added.

Run `node tests/anki_scheduler_check.cjs` to verify scheduling.
