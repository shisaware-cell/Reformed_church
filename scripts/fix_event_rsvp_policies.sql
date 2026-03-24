-- Fix RLS policies for RSVP writes on public.event_rsvps
-- Run this in the Supabase SQL editor for the same project used by the app.

alter table if exists public.event_rsvps enable row level security;

-- Remove old policies if they exist to keep this script repeatable.
drop policy if exists event_rsvps_read_all on public.event_rsvps;
drop policy if exists event_rsvps_insert_own on public.event_rsvps;
drop policy if exists event_rsvps_update_own on public.event_rsvps;
drop policy if exists event_rsvps_delete_own on public.event_rsvps;

-- Anyone can read RSVP counts.
create policy event_rsvps_read_all
on public.event_rsvps
for select
to public
using (true);

-- Signed-in users can RSVP for themselves.
create policy event_rsvps_insert_own
on public.event_rsvps
for insert
to authenticated
with check (auth.uid() = user_id);

-- Signed-in users can edit/cancel only their own RSVP rows.
create policy event_rsvps_update_own
on public.event_rsvps
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy event_rsvps_delete_own
on public.event_rsvps
for delete
to authenticated
using (auth.uid() = user_id);

-- Optional but recommended if you want one RSVP row per user per event.
create unique index if not exists event_rsvps_event_user_uidx
on public.event_rsvps (event_id, user_id);
