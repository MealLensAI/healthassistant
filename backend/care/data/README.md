# Local JSON database

`database.json` is created here the first time you start the API. It uses the same tables and column names as `backend/sql/schema.sql`, so we can move these rows into Supabase later without renaming anything.

Tables:

- `profiles`
- `dietitians` — `status` is `pending` until admin approves
- `applications` — uploaded license/degree documents live on each row
- `conversations`, `conversation_participants`, `messages`
- `appointments`
- `patient_files`, `patient_profiles`, `patient_settings`
- `consultation_requests`
- `device_sessions`
- `payment_methods`, `payment_quotes`, `payments`
- `missed_calls`, `notifications`, `live_calls`

Patients only see dietitians whose `dietitians.status` is `approved`.
