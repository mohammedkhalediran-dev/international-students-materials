# Proposal: optional cloud copy of Study Mode data (not built)

Status: proposal only, waiting for Mohammed's decision. Nothing in the site stores Study Mode data on the server today.

## Today
- Signed-in students sync only `ms.fav ms.read ms.last ms.exam ms.review ms.study` (small progress keys) to Cloudflare D1.
- Cards, notes, ink, masks, goals and timer live only in the browser of one device. A student who changes iPad or clears Safari data loses them unless they kept a backup file (Step 40).

## Idea
A "save my study data to my account" switch, off by default, using the existing Google login and D1 database. It uploads the same per-lecture JSON the unified backup already produces (`medixa-local-backup-v40`), one row per student per lecture.

## Rules it would follow
- Opt-in per student; clear wording in privacy.html before turning it on.
- Size cap per lecture (proposal: 1 MB) and per student (proposal: 20 MB). Ink is the largest item.
- Upload only after a successful local save; never on page load.
- Conflict rule: the server copy carries a version number; an upload from a device with an older version is refused and the student chooses "keep this device" or "use the account copy" (same principle as the Step 42 two-tab guard). No silent merge except ink, which can be merged by adding strokes as the backup import already does.
- Logout does not delete local Study Mode data (current behaviour) and does not delete the account copy.
- Admins cannot read students' study content in admin.html.

## Questions for Mohammed
1. Do you want study data on the server at all, or keep it on the device plus backup files?
2. Are the size caps acceptable on the free D1 plan (5 GB total, 100k writes per day)?
3. Should it cover all lectures or only the current semester?
4. Who may delete a student's cloud copy: only the student, or also an admin on request?
