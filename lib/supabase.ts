import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lfpyaefmeynyixdcnkxu.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcHlhZWZtZXlueWl4ZGNua3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDQzNDQsImV4cCI6MjA4OTA4MDM0NH0.XwVLWiLPjQBgmIln8UrviWxKEqU7FUs5Ulg4S6CFhHA';

export const supabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY_HERE');

if (!supabaseConfigured) {
  console.warn('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function ensureUserProfile(authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }, preferredName?: string) {
  const email = (authUser.email || '').toLowerCase();

  const candidateName =
    (preferredName || '').trim() ||
    (typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : '') ||
    (email ? email.split('@')[0] : '') ||
    'Member';

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  const keepExistingName = typeof existing?.name === 'string' && existing.name.trim().length > 0 && existing.name.trim() !== 'Member';

  const upsertPayload = {
    id: authUser.id,
    email,
    name: keepExistingName ? existing.name : candidateName,
    role: existing?.role || 'member',
    profile_image_url: existing?.profile_image_url || null,
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    return existing || null;
  }

  return data;
}
