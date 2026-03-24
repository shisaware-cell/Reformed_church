-- Run this in Supabase SQL editor.
-- Adds app content tables for songs and teachings plus storage bucket policies.

create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_name text,
  description text,
  file_url text,
  cover_image_url text,
  duration_seconds integer,
  is_published boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text,
  description text,
  media_url text,
  media_type text not null default 'audio' check (media_type in ('audio', 'video')),
  thumbnail_url text,
  is_published boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.songs enable row level security;
alter table public.teachings enable row level security;

-- Public app can read published rows.
drop policy if exists songs_public_read on public.songs;
create policy songs_public_read
on public.songs
for select
to public
using (is_published = true);

drop policy if exists teachings_public_read on public.teachings;
create policy teachings_public_read
on public.teachings
for select
to public
using (is_published = true);

-- Admins can manage all rows.
drop policy if exists songs_admin_all on public.songs;
create policy songs_admin_all
on public.songs
for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

drop policy if exists teachings_admin_all on public.teachings;
create policy teachings_admin_all
on public.teachings
for all
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

-- Optional: updated_at triggers.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_songs_touch_updated_at on public.songs;
create trigger trg_songs_touch_updated_at
before update on public.songs
for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_teachings_touch_updated_at on public.teachings;
create trigger trg_teachings_touch_updated_at
before update on public.teachings
for each row execute procedure public.touch_updated_at();

-- Storage buckets used by admin dashboard uploads.
insert into storage.buckets (id, name, public)
values
  ('songs-media', 'songs-media', true),
  ('song-covers', 'song-covers', true),
  ('teachings-media', 'teachings-media', true),
  ('teaching-thumbnails', 'teaching-thumbnails', true)
on conflict (id) do nothing;

-- Public can read files.
drop policy if exists songs_media_public_read on storage.objects;
create policy songs_media_public_read
on storage.objects
for select
to public
using (bucket_id in ('songs-media', 'song-covers', 'teachings-media', 'teaching-thumbnails'));

-- Admin can upload/update/delete files in these buckets.
drop policy if exists songs_media_admin_write on storage.objects;
create policy songs_media_admin_write
on storage.objects
for all
to authenticated
using (
  bucket_id in ('songs-media', 'song-covers', 'teachings-media', 'teaching-thumbnails')
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  bucket_id in ('songs-media', 'song-covers', 'teachings-media', 'teaching-thumbnails')
  and exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);
