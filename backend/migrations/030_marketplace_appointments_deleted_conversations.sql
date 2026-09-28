-- Allow appointments to be marked deleted (trash) instead of completed/cancelled only.
-- Soft-hide conversations per user so inbox can be cleared without wiping the peer's history.

alter table public.mp_appointments
  drop constraint if exists mp_appointments_status_check;

alter table public.mp_appointments
  add constraint mp_appointments_status_check
  check (status in ('upcoming', 'completed', 'cancelled', 'no_show', 'deleted'));

alter table public.mp_conversations
  add column if not exists hidden_for jsonb not null default '[]'::jsonb;
