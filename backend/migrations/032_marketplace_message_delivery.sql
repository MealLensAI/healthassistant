-- Optional delivery metadata for WhatsApp-style chat status.
-- Safe to run multiple times. App still works if this is delayed.

alter table public.mp_messages
  add column if not exists delivery_status text not null default 'sent';

alter table public.mp_messages
  add column if not exists delivered_at timestamptz;

alter table public.mp_messages
  add column if not exists read_at timestamptz;

-- Relaxed check so older rows remain valid.
do $$
begin
  alter table public.mp_messages
    drop constraint if exists mp_messages_delivery_status_check;
  alter table public.mp_messages
    add constraint mp_messages_delivery_status_check
    check (delivery_status in ('sent', 'delivered', 'read'));
exception
  when others then null;
end $$;
