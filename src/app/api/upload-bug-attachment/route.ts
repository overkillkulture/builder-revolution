import { NextResponse } from 'next/server';
import { supabase } from '@/lib/s3/s3Client';

// POST /api/upload-bug-attachment
// Accepts multipart FormData with a `file` field (from public/bug-button.js),
// uploads it to the public `bug-attachments` Supabase Storage bucket, and
// returns { url }. This route did not exist before S444 → every attachment
// 404'd and was silently dropped (MC-06).
const BUCKET = 'bug-attachments';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
// Raster images ONLY. The bucket is PUBLIC, so allowing client-chosen MIME let
// anyone host active content (text/html, image/svg+xml with <script>) under our
// domain = stored XSS/phishing. Force type+extension from this allowlist (S446).
// Note: SVG is intentionally excluded (it can execute script).
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported file type (images only: png, jpg, webp, gif)' }, { status: 415 });
  }
  const contentType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  const fileName = `bug-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
  return NextResponse.json({ url });
}
