-- Fix: community shows "Member" for everyone except self
-- Run in Supabase SQL editor.

begin;

-- 1) Ensure RLS is enabled.
alter table public.users enable row level security;

-- 2) Authenticated users can read basic public profile fields for all members.
drop policy if exists users_public_read_authenticated on public.users;
create policy users_public_read_authenticated
on public.users
for select
to authenticated
using (true);

-- 3) Keep writes scoped to owner.
drop policy if exists users_insert_own on public.users;
create policy users_insert_own
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 4) Backfill missing/member names from auth metadata/email.
update public.users u
set name = coalesce(
  nullif(trim(au.raw_user_meta_data ->> 'name'), ''),
  nullif(split_part(coalesce(au.email, u.email, ''), '@', 1), ''),
  'Member'
)
from auth.users au
where au.id = u.id
  and (
    u.name is null
    or btrim(u.name) = ''
    or lower(btrim(u.name)) = 'member'
  );

commit;
