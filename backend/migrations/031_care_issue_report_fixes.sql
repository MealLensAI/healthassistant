-- Run in the Supabase SQL editor after migrations 025-029.
-- Safe to run if 030 was already applied. Preserves existing records.
begin;
alter table public.mp_appointments drop constraint if exists mp_appointments_status_check;
alter table public.mp_appointments add constraint mp_appointments_status_check
  check (status in ('upcoming', 'completed', 'cancelled', 'no_show', 'deleted'));
alter table public.mp_conversations add column if not exists hidden_for jsonb not null default '[]'::jsonb;
create index if not exists mp_participants_user_conversation_idx
  on public.mp_conversation_participants (user_id, conversation_id);
create index if not exists mp_live_calls_callee_idx on public.mp_live_calls (callee_id);
create index if not exists mp_missed_calls_user_created_idx
  on public.mp_missed_calls (user_id, created_at desc);
create index if not exists mp_dietitians_user_idx on public.mp_dietitians (user_id);
commit;
