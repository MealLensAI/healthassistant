# Call camera fallback and hangup fixes — September 28, 2026

## Requested behavior

- Patient and dietitian call tiles show that participant's profile photo when their camera is off, or their name when there is no photo.
- Ending a call from either side closes the other participant's call instead of leaving a connection-failed message.

## Causes and implementation

`MediaStreamTrack.enabled = false` on the sender does not set the remote track's `enabled` flag to false. The old UI still displayed that remote video, which contained black frames. The caller now negotiates a reliable WebRTC data channel before sending its offer. Each participant sends their current camera state when the channel opens and whenever their camera availability changes. Track mute, unmute, end and device replacement are also handled.

`VideoStage` keeps the remote participant as the main tile and the local participant in the preview. Each has its own photo/name fallback. A failed photo URL also falls back to the name. Turning the camera back on restores video. The prior participant's photo cannot carry over to a new call. The same component serves both patient and dietitian sessions and expanded/minimized call views.

The main hangup bug was in `mergeCarePulse`: it preserved the old call whenever the server returned an empty live-call list. Empty lists now clear calls. A local hangup sends a peer message before tearing down the connection. The server also emits a scoped `call_ended` event to both participants. Lifecycle polling continues at a lower frequency after media connects as a fallback. A brief failure grace period allows normal terminal events to arrive before showing a network error.

Ended-call IDs prevent late responses from reopening a call. Request generations protect against old empty snapshots arriving after START/ANSWER commits. Only unacknowledged starts are temporarily preserved; later authoritative empty responses still end calls. Hangups target a specific call ID, quick cancellation waits for the start request, and receiving a peer hangup clears local state without issuing another END_CALL request.

## Files

- `frontend/src/components/calls/VideoStage.tsx`: participant tiles and track availability.
- `frontend/src/lib/care/callMedia.tsx`: camera control channel, hangup reception, lifecycle polling and cleanup.
- `frontend/src/lib/care/callControls.ts`: validated, call-scoped peer messages and synchronous local hangup notification.
- `frontend/src/lib/care/calls.ts`: correct participant identity/photo fallback.
- `frontend/src/lib/care/callLifecycle.ts`: stale-response protection and ended-call reconciliation.
- `frontend/src/lib/care/context.tsx`, `api.ts`, `store.ts`, `realtime.ts`: authoritative call removal, scoped end requests and realtime dismissal.
- `backend/routes/care_routes.py`: participant-scoped realtime call-end events.
- `frontend/src/lib/care/callControls.test.ts`, `calls.test.ts`, `callLifecycle.test.ts`, and `backend/tests/test_care_api.py`: regressions.

Paths above are relative to `/Users/daniel/PycharmProjects/meallensa/healthassistant`.

## Verification

- Production frontend build passed (`npm run build` in `frontend`). Existing large-bundle, asset and mixed-import warnings remain.
- Seven Vitest suites passed: **36 tests**, including call lifecycle, state synchronization and existing marketplace regressions. Used the already cached Vitest executable; no dependency installation was made.
- New Node test-runner suites passed: **7 tests**, covering bidirectional camera state, hangup, stale/malformed messages, no-camera fallback and correct participant identity.
- Backend care API suite passed: **31 tests**, using the isolated memory store. Tests include both caller and callee hanging up, participant-scoped events, call removal and idempotent end requests.
- Separate Chromium pages used the production `CallMediaProvider`, `CallWindow` and `VideoStage`, actual paired `RTCPeerConnection`s, generated media tracks and isolated signaling. Verified both camera directions, both cameras off, cameras restored, audio-only operation, missing/broken photos and hangup from either side. Both dialogs, peer connections and capture tracks closed; no connection-error message or page error appeared. The signaling rows remained present, so remote closure independently verified the direct peer hangup message.
- Targeted lint reported no errors and the existing React Refresh export warning in `callMedia.tsx`. Full project TypeScript checking still has unrelated existing errors and missing local Vitest declarations; it is not claimed clean.

Temporary browser harness: `/tmp/meallens-call-verification/run.mjs` (may be removed by the operating system). It used a separate ephemeral signaling fixture, not the application backend or real accounts.

No SQL migration, credentials, real account data, or database records were changed for this fix. The user's backend was not started, stopped or restarted. Restart the user-managed backend as needed to load its route update, and reload both participants' browsers before testing a new call. Physical-device and cross-network calls were not exercised in this isolated verification.

## Follow-up: collapsed sidebar and missing dietitian photo

The user then provided `Screenshot 2026-09-28 at 02.14.30.png`, showing overlapping text and the Start video call button, and reported that only patient photos worked. The initial browser checks above used a dietitian without a photo; they did not cover a dietitian whose photo existed only on their listing.

The compact frame combined `flex-1` (zero flex basis) with absolutely positioned media/fallback layers. In a content-sized sidebar it collapsed to zero height. `VideoStage` now gives compact frames a fixed height and minimum height with `flex-none`. Compact photos/names fit below the status text, and minimized calls reserve separate space for the local preview. Reproduced the old 247 × 0 pixel frame; corrected patient/dietitian idle and incoming frames measured 247 × 208 pixels, with the controls below the frame.

The minimized call window also inherited `min-height: 100%` from the marketplace theme root, pushing its header above the viewport. `CallWindow` overrides that minimum only in its floating view, while retaining the theme scope.

Dietitian headers already used `accountAvatar` to read a listing photo when the account photo was empty, but call components read `currentUser.avatar` alone. Also, Supabase call hydration and pulse responses rebuilt call photos solely from `mp_profiles.avatar_key`. The follow-up makes these paths consistent:

- CallWindow, MessagesPage and CarePage resolve local photos through `accountAvatar` and peer photos through `withCallPeerAvatar`.
- Local call creation resolves participants by their account IDs, with the matching dietitian listing/application fallback.
- `backend/care/media.py` adds `account_avatar`; `service.py` uses it during call creation, and `db.py` during full hydration and participant-scoped pulse reads.
- Account photos take precedence, then that account's dietitian listing, then its application photo. Another account's photo is never selected by a matching listing ID. R2 keys remain stored references and are signed only for responses.
- New `backend/tests/test_call_avatars.py` covers both call directions, Supabase reload/pulse behavior, photo precedence/ownership, and signing. The frontend call resolver test covers listing ID versus account ID isolation.

Follow-up checks: 36 isolated backend tests passed, 12 Node tests passed, 20 Vitest state/lifecycle tests passed, and the frontend production build passed. Focused frontend type/lint checks showed no new issues in the modified call display paths. The complete project TypeScript check remains affected by existing unrelated errors. Real Supabase data and the user-managed backend process were untouched; no SQL is required.

The updated browser fixture also checks an actual listing-only dietitian photo distinct from the patient's photo, in both local and remote tiles. All 12 browser scenarios passed, including the narrow sidebar, minimized viewport bounds, camera toggles, missing/broken photos and both hangup directions. Screenshots were visually inspected at `/tmp/meallens-call-verification/after-dietitian-idle-sidebar.png`, `after-patient-incoming-sidebar.png`, `patient-minimized-legacy-avatar.png` and `dietitian-minimized-legacy-avatar.png` (temporary files). The minimized dialog measured about 477 pixels high in a 900-pixel viewport, with its header fully visible and both identities separated.
