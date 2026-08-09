import { randomUUID } from 'crypto';
import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { getRoomMembership, canSee, ROLE_RANK } from '@/lib/rooms/roomRoles';
import {
  isValidRoomFileType,
  extOf,
  MAX_ROOM_FILE_BYTES,
} from '@/lib/isValidRoomFileType';
import { uploadRoomFile } from '@/lib/s3/roomFilesStorage';
import { NextResponse } from 'next/server';

const VALID_CATEGORIES = ['DOCUMENT', 'EVIDENCE', 'ASSET', 'OTHER'];

// POST /api/rooms/:roomId/files — upload a room-scoped file (role >= builder).
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const roomId = parseInt(params.roomId);
  if (Number.isNaN(roomId)) {
    return NextResponse.json({ error: 'Bad room id' }, { status: 400 });
  }

  // Membership gate FIRST — non-members can never touch a room's files.
  const membership = await getRoomMembership(roomId, user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }
  // Upload requires builder+ (guests/members are read-only by default).
  if ((ROLE_RANK[membership.role?.toLowerCase()] ?? -1) < ROLE_RANK.builder) {
    return NextResponse.json(
      { error: 'Builder role or higher required to upload' },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob) || typeof (file as File).name !== 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const upload = file as File;

  if (!isValidRoomFileType(upload.name)) {
    return NextResponse.json({ error: `File type .${extOf(upload.name)} not allowed` }, { status: 400 });
  }
  if (upload.size > MAX_ROOM_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_ROOM_FILE_BYTES / (1024 * 1024)}MB)` },
      { status: 400 },
    );
  }

  const categoryRaw = String(form.get('category') ?? 'DOCUMENT').toUpperCase();
  const category = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : 'DOCUMENT';

  // minRole cannot exceed the uploader's own role (can't hide a file above yourself
  // in a way you couldn't then manage).
  const minRoleRaw = String(form.get('minRole') ?? 'member').toLowerCase();
  const minRole = ROLE_RANK[minRoleRaw] !== undefined ? minRoleRaw : 'member';

  const storageKey = `room-${roomId}/${randomUUID()}.${extOf(upload.name)}`;
  const buffer = Buffer.from(await upload.arrayBuffer());
  await uploadRoomFile(buffer, storageKey, upload.type || 'application/octet-stream');

  const row = await prisma.roomFile.create({
    data: {
      conversationId: roomId,
      uploaderId: user.id,
      storageKey,
      fileName: upload.name,
      mimeType: upload.type || 'application/octet-stream',
      sizeBytes: upload.size,
      category,
      minRole,
    },
    select: {
      id: true,
      fileName: true,
      category: true,
      mimeType: true,
      sizeBytes: true,
      minRole: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, file: row }, { status: 201 });
}

// GET /api/rooms/:roomId/files — list files the caller is allowed to see.
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const roomId = parseInt(params.roomId);
  if (Number.isNaN(roomId)) {
    return NextResponse.json({ error: 'Bad room id' }, { status: 400 });
  }

  const membership = await getRoomMembership(roomId, user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }

  const files = await prisma.roomFile.findMany({
    where: { conversationId: roomId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      category: true,
      mimeType: true,
      sizeBytes: true,
      minRole: true,
      uploaderId: true,
      createdAt: true,
      uploader: { select: { id: true, name: true, username: true } },
    },
  });

  // App-side gate: caller sees a file if their role clears minRole, OR they uploaded it.
  const visible = files.filter(
    (f) => canSee(membership.role, f.minRole) || f.uploaderId === user.id,
  );

  return NextResponse.json({ files: visible });
}
