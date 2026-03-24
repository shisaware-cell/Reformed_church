import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

export function guessImageContentType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

export function guessImageExtension(uri: string) {
  const last = uri.split('?')[0].split('#')[0];
  const ext = last.split('.').pop()?.toLowerCase();
  if (!ext || ext.length > 5) return 'jpg';
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

export async function uploadImageUriToStorage(opts: {
  bucket: string;
  path: string;
  uri: string;
  contentType?: string;
}) {
  const FileSystem = await import('expo-file-system/legacy');

  const base64 = await FileSystem.readAsStringAsync(opts.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error: uploadError } = await supabase.storage
    .from(opts.bucket)
    .upload(opts.path, decode(base64), {
      contentType: opts.contentType || guessImageContentType(opts.uri),
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload failed');
  }

  return supabase.storage.from(opts.bucket).getPublicUrl(opts.path).data.publicUrl;
}
