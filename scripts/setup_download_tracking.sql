create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  page text not null default 'download',
  asset_name text,
  user_agent text,
  referrer text,
  page_url text,
  created_at timestamptz not null default now()
);

alter table public.download_events enable row level security;

drop policy if exists "public can insert download events" on public.download_events;
create policy "public can insert download events"
  on public.download_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admins can read download events" on public.download_events;
create policy "admins can read download events"
  on public.download_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );