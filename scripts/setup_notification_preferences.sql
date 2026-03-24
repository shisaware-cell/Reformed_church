-- Run this in Supabase SQL editor to enable app-side notification preference sync.

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  announcements_enabled boolean not null default true,
  events_enabled boolean not null default true,
  articles_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_push_tokens (
  user_id uuid primary key references public.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;
alter table public.user_push_tokens enable row level security;

-- Preferences: users can read and upsert their own row.
drop policy if exists "users can read own notification preferences" on public.user_notification_preferences;
create policy "users can read own notification preferences"
  on public.user_notification_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can upsert own notification preferences" on public.user_notification_preferences;
create policy "users can upsert own notification preferences"
  on public.user_notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins can read all notification preferences" on public.user_notification_preferences;
create policy "admins can read all notification preferences"
  on public.user_notification_preferences
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );

-- Push token: users can read and upsert only their own token.
drop policy if exists "users can read own push token" on public.user_push_tokens;
create policy "users can read own push token"
  on public.user_push_tokens
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can upsert own push token" on public.user_push_tokens;
create policy "users can upsert own push token"
  on public.user_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "admins can read all push tokens" on public.user_push_tokens;
create policy "admins can read all push tokens"
  on public.user_push_tokens
  for select
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'admin'
    )
  );
