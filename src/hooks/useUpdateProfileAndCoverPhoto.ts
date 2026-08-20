import 'server-only';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { v4 as uuid } from 'uuid';
import { uploadObject } from '@/lib/s3/uploadObject';
import { fileNameToUrl } from '@/lib/s3/fileNameToUrl';
import { getServerUser } from '@/lib/getServerUser';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
export async function useUpdateProfileAndCoverPhoto({
  request,
  userIdParam,
  toUpdate,
}: {
  request: Request;
  userIdParam: string;
  toUpdate: 'profilePhoto' | 'coverPhoto';
}) {
  const [user] = await getServerUser();
  if (!user || user.id !== userIdParam) {
    return NextResponse.json({}, { status: 401 });
  }
  const userId = user.id;

  const formData = await request.formData();
  const file = formData.get('file') as Blob | null;

  if (!file) {
    return NextResponse.json({ error: 'File blob is required.' }, { status: 400 });
  }

  try {
    const fileExtension = file.type.split('/')[1];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
    }

    // Upload image to S3. NOTE: pass the MIME type (file.type, e.g. "image/png")
    // as the Content-Type — NOT the bare extension. Supabase Storage rejects a
    // non-MIME Content-Type with 415 invalid_mime_type, which was silently
    // turning EVERY profile/banner upload into a 500 (bug #2).
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}-${uuid()}.${fileExtension}`;
    await uploadObject(buffer, fileName, file.type);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        [toUpdate]: fileName,
      },
    });

    await prisma.post.create({
      data: {
        userId,
        content: toUpdate === 'profilePhoto' ? '#NewProfilePhoto' : '#NewCoverPhoto',
        visualMedia: {
          create: [
            {
              userId,
              fileName,
              type: 'PHOTO',
            },
          ],
        },
      },
    });

    const uploadedTo = fileNameToUrl(fileName);

    return NextResponse.json({ uploadedTo });
  } catch (error) {
    // Surface the real cause instead of a blank "Server error" (nothing-silent).
    console.error('profile/cover photo upload failed:', error);
    const message = error instanceof Error ? error.message : 'Server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
