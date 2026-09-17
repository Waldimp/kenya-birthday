-- Kenya invite — convive con piano en el MISMO proyecto de Supabase.
-- Piano se queda en public (songs, requests). Esto vive en schema invite.
--
-- 1. SQL Editor → pegar esto → Run
-- 2. Project Settings → API → Exposed schemas → agregar "invite" → Save
--    (sin ese paso PostgREST no ve el schema)

create schema if not exists invite;

create table if not exists invite.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  attending text not null check (attending in ('si', 'no', 'talvez')),
  guests integer not null default 1 check (guests between 0 and 10),
  phone text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists rsvps_created_at_idx on invite.rsvps (created_at desc);

alter table invite.rsvps enable row level security;

drop policy if exists "public can insert rsvps" on invite.rsvps;
create policy "public can insert rsvps"
  on invite.rsvps
  for insert
  to anon, authenticated
  with check (true);

grant usage on schema invite to anon, authenticated, service_role;
grant insert on table invite.rsvps to anon, authenticated;
grant all on table invite.rsvps to service_role;
