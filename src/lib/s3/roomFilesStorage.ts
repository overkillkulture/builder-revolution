import 'server-only';
import { supabase } from './s3Client';

// Private bucket for room-scoped files (Build Guild / Case Builder documents).
// UNLIKE `hq-posts` (public, image/video social posts), this bucket is PRIVATE:
// downloads are only ever served via short-lived signed URLs after a role gate passes.
// Create the bucket once in Supabase Storage as PRIVATE (not public).
export const ROOM_FILES_BUCKET = 'room-files';

// Upload bytes to the private room-files bucket under a room-namespaced key.
export async function uploadRoomFile(
  file: Buffer,
  storageKey: string,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .upload(storageKey, file, { contentType, upsert: false });

  if (error) {
    throw new Error(`Room file upload failed: ${error.message}`);
  }
}

// Delete bytes from the private room-files bucket.
export async function deleteRoomFile(storageKey: string) {
  const { error } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .remove([storageKey]);

  if (error) {
    throw new Error(`Room file delete failed: ${error.message}`);
  }
}

// Mint a short-lived signed URL for one download. Never hand out a permanent URL.
export async function createRoomFileSignedUrl(storageKey: string, expiresInSeconds = 60) {
  const { data, error } = await supabase.storage
    .from(ROOM_FILES_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? 'no url returned'}`);
  }
  return data.signedUrl;
}
