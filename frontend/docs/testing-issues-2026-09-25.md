# Testing report fixes

Source: `Untitled document (3).pdf` (19 numbered observations).

| PDF issues | Changes |
| --- | --- |
| 1, 9 | Chat attachments are saved together with the shared health-file record. Both chat entry points await the server and retain unsent content on failure. File reading errors and the 10 MB size limit are displayed. Data-backed documents get revocable, safe blob URLs for opening/download. |
| 2 | Unanswered calls expire after 45 seconds when care state is polled, including after a participant reconnects. Both participants receive the outcome; missed calls and answered calls have distinct persistent chat entries. |
| 3, 11 | One audio player per call provider plays the remote stream independently of visible video panels. Browser playback blocking exposes an Enable call audio button. Camera failure falls back to audio; microphone/camera selectors replace active tracks, and mute controls work on mobile too. |
| 4, 14 | Notification menus have opaque theme-aware surfaces, dark unread rows, and stacking above the video panel. |
| 5, 6 | Updated the home guidance copy and restored readable search placeholder text. |
| 7 | Both patient and dietitian sidebars count unfinished appointments, excluding completed/cancelled appointments. |
| 8 | Main-account profile photos synchronize into the shared care user record without overwriting a newer care photo. |
| 10 | Incoming calls generate a repeating browser ringtone, stopped on answer/end. |
| 12 | Each care toast dismisses after five seconds; persistent notifications remain in the notification center. |
| 13 | Both chat views mark messages read when the thread is visible, including newly received messages and returning to the browser tab. |
| 15, 17 | Shared tables use dark surfaces and readable header/body colors, including invitation, file, and payment tables. Subscription payment labels and form surfaces use theme tokens. |
| 16 | Patient file navigation and headings now say My Health Files. |
| 18 | Both patient profile implementations contain a password form connected to the existing authenticated change-password and password-reset endpoints. The old simulated dietitian form now uses the real component too. |
| 19 | The dietitian patient chart uses the patient profile's width, round photo header, summary cards, and section titles, retaining clinician actions and read-only clinical details. |

Care requests serialize the existing snapshot/update/save operation, including WebRTC signaling, across threads and Gunicorn workers on a single host. This prevents attachments or ICE candidates being overwritten by simultaneous requests. A separate existing misplaced function return in AdminMealPlanManager was corrected so TypeScript can parse the project.

## Verification

- `python3 -m pytest backend/tests/test_care_api.py -q`: 17 passed, covering attachments, JSON persistence, profile photos, read markers, missed/answered calls, and concurrent ICE candidates.
- `npm run build` in frontend: passes (existing bundle-size/dynamic-import warnings).
- Isolated Flask memory store plus two Chrome contexts with simulated media: attachment delivery and reload persistence, bidirectional inbound audio packets and audio playback, microphone selection, mute, answered-call history, and five-second toast dismissal passed. No browser runtime errors in that run.
- Additional browser run passed incoming ringtone generation, mobile controls, and bidirectional audio with the patient camera unavailable.
- Dark-mode screenshots reviewed for chat/notifications, search, files, patient profile, and clinician patient chart.
- Full TypeScript checking still reports pre-existing errors across the project, including missing test/UI dependencies, API response types, and unused declarations. It is not a clean project-wide type check.

## Deployment / manual checks

- Real microphones, speakers, permission prompts, and cross-network connections still need a two-device check; simulated-device tests do not establish physical audio quality.
- HTTPS (or localhost) is required for browser media capture. Browser audio policies may require a prior user interaction before the ringtone can play; blocked remote audio has an explicit enable button.
- Configure `VITE_TURN_URL` (comma-separated TURN URLs), `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` when deploying behind restrictive networks. The default STUN server cannot relay traffic. Use TURN credentials intended for browser clients.
- The care store lock coordinates processes on one host. Multiple independent hosts sharing the Supabase whole-state store still require database-level transactions/distributed coordination.
- Password operations use the existing account backend; browser QA did not change any real user's password or send reset emails.
