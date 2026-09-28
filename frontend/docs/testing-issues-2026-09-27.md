# September 27 issue report fixes

Source: `/Users/daniel/Downloads/1Test and issues found_.pdf` (five pages, including the final blank page). Existing workspace changes were preserved. This checklist describes the additional fixes made in this task, not a claim that production is deployed or that physical calls were tested.

| Report items | Implementation |
| --- | --- |
| 1, 7: messages do not arrive | Fetch message bodies when conversation headers change, retry failed fetches, use a scoped database message query, avoid duplicate optimistic messages, and report conversation-creation failures instead of opening a ghost thread. |
| 2: wrong profile destination | Dietitian avatar links use the public `/dietitians/:id` route. |
| 3: slow directory/data | Remove a duplicate bootstrap fetch, load the catalog independently of the full state, skip application reads for patients, and remove full-marketplace reads from Supabase pulse/message polling. |
| 5, 13: appointment refresh | Admin pulse queries all appointments; patient/dietitian pulses include status updates. New appointment peers include names and avatars. |
| 9: save errors | Patient profile/settings persistence keys rows by `user_id`; actions display server errors and wait for confirmation before changing local state. |
| 10–12: calls | Persist the conversation and call before initiating signaling; retain unrelated active calls; serialize signal writes in the Flask worker; update call status without overwriting newer ICE/SDP. Existing 45-second expiry now runs from the lightweight pulse. |
| 13b, 14, 19: complete/delete | Check appointment ownership, return deletion tombstones for immediate removal, and provide the database status constraint update. Deleted appointments cannot be completed. |
| 16: approval error on patient upload | Sync the active host role back to the backend so a prior practice visit cannot leave a patient permanently marked as a dietitian. Account-photo updates remain outside the dietitian approval gate. |
| 17: patient files | Include appointment-linked patient identities/profiles; refresh chart data when opening it; preserve server-side file-access blocks. |
| 18: loading feedback | Shared care buttons track promise-returning actions, display a spinner and disable repeat clicks; call/appointment/consultation handlers wait for completion. Async profile/settings/file saves show success only after saving. This does not claim every button in unrelated meal-planning/billing screens was audited. |
| 20: “Care team” instead of patient | Pulse responses include participant and appointment-patient identities, merged into frontend users. |
| 21: duplicate/wrong booking | Validate the selected approved listing, bind bookings to the caller, and treat repeated upcoming bookings for the same patient/listing/date/time as idempotent. Accepting a consultation twice does not create a second appointment; accepted appointments are persisted. |

## Database step

Run `backend/migrations/031_care_issue_report_fixes.sql` in the Supabase SQL editor after the existing 025–029 schema migrations. It also includes migration 030's changes and is safe if 030 was already run. It preserves existing records and adds indexes. No migration or production data change was executed during this task. Existing duplicate appointments are not automatically removed.

## Validation

- Backend: `backend/.venv/bin/python -m pytest backend/tests/test_care_api.py -q` — 29 passed, including new API and mocked Supabase persistence/pulse regressions.
- Frontend Vitest suites — 27 passed, including deletion, peer hydration and profile routing regressions. Used the existing cached Vitest installation; excluded the three Node test-runner files.
- Node test-runner suites (bundled with existing esbuild) — 7 passed: avatars, photo ownership and ringtone behavior.
- Isolated Chrome browser check — passed for the shared button spinner, disabled state, and reset after completion.
- `npm run build` in frontend — passed. Existing large-chunk and asset/import warnings remain.
- Full TypeScript check is not clean: pre-existing errors and missing local Vitest declarations remain. No application type errors were reported for the updated care context, calls, buttons, appointment/message/profile pages or routing helper in the focused check.

## Remaining live verification

After applying SQL and restarting the backend/frontend, test two separate patient/dietitian sessions: exchange messages, create/complete/delete one booking, upload and open a patient document, and call in both directions (answer and let ring for 45 seconds). Verify the admin calendar changes without a reload. Physical audio/video, R2 access and deployed Supabase schema were not verified here. Cross-network calls may require the existing `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` deployment settings. The signal lock is per Flask process; multi-worker deployments still require database-atomic signal appends for a full concurrency guarantee. Booking idempotency is enforced against the loaded state, not by a cross-worker database uniqueness constraint.
