-- Seed test data with 3 users, profile pictures, and church-related posts
-- Run this in Supabase SQL editor after running setup_music_teachings.sql

-- Insert 3 test users
-- Note: You'll need to set their passwords via Supabase Auth dashboard or API
insert into public.users (id, email, name, profile_image_url, role, created_at)
values
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'sarah.johnson@church.com',
    'Sarah Johnson',
    'https://i.pravatar.cc/150?img=12&u=sarah',
    'user',
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'michael.williams@church.com',
    'Michael Williams',
    'https://i.pravatar.cc/150?img=24&u=michael',
    'user',
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'elizabeth.martinez@church.com',
    'Elizabeth Martinez',
    'https://i.pravatar.cc/150?img=32&u=elizabeth',
    'user',
    now()
  )
on conflict (id) do nothing;

-- Insert 3 posts with church-related content
insert into public.posts (id, user_id, content, image_url, likes_count, created_at, updated_at)
values
  (
    '650e8400-e29b-41d4-a716-446655550001'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'What a blessing to worship with our congregation this Sunday! The sermon on faith and trust really touched my heart. So grateful for our church family and the spiritual growth we experience together. 🙏✨',
    'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&h=400&fit=crop',
    5,
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '650e8400-e29b-41d4-a716-446655550002'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Just finished volunteering at the community outreach program! Helped prepare meals for families in need. This is what Jesus taught us - to serve others with love and humility. Feeling truly blessed today! ❤️',
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=500&h=400&fit=crop',
    12,
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '650e8400-e29b-41d4-a716-446655550003'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Prayer circle this Wednesday evening was so uplifting. Being surrounded by believers who lift each other up in prayer is truly powerful. If anyone wants to join us, we meet in the fellowship hall at 7 PM. All are welcome! 🕯️🙏',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=400&fit=crop',
    8,
    now() - interval '2 days',
    now() - interval '2 days'
  )
on conflict (id) do nothing;
