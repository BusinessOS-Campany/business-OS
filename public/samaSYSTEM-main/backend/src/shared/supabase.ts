import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let supabase: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!supabase) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

export async function ensureBucket(bucket: string): Promise<void> {
  const client = getClient();
  const { data: existing } = await client.storage.getBucket(bucket);
  if (!existing) {
    const { error: createError } = await client.storage.createBucket(bucket, { public: true });
    if (createError) throw createError;
  }
}

export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path);
  return publicUrl.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const client = getClient();
  await client.storage.from(bucket).remove([path]);
}
