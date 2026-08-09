import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { getRoomMembership, canSee, ROLE_RANK } from '@/lib/rooms/roomRoles';
import { deleteRoomFile, createRoomFileSignedUrl } from '@/lib/s3/roomFilesStorage';
import { NextResponse } from 'next/server';

// GET /api/rooms/:roomId/files/:fileId — mint a short-lived signed download URL.
export async function GET(
  request: Request,
  { params }: { params: { roomId: string; fileId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const roomId = parseInt(params.roomId);
  const fileId = parseInt(params.fileId);
  if (Number.isNaN(roomId) || Number.isNaN(fileId)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  }

  const membership = await getRoomMembership(roomId, user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }

  const file = await prisma.roomFile.findFirst({
    where: { id: fileId, conversationId: roomId },
  });
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  // Per-file gate: role clears minRole OR caller is the uploader.
  if (!canSee(membership.role, file.minRole) && file.uploaderId !== user.id) {
    return NextResponse.json({ error: 'Not allowed to view this file' }, { status: 403 });
  }

  const url = await createRoomFileSignedUrl(file.storageKey, 60);
  return NextResponse.json({ url, fileName: file.fileName, mimeType: file.mimeType });
}

// DELETE /api/rooms/:roomId/files/:fileId — uploader or admin/owner may delete.
export async function DELETE(
  request: Request,
  { params }: { params: { roomId: string; fileId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const roomId = parseInt(params.roomId);
  const fileId = parseInt(params.fileId);
  if (Number.isNaN(roomId) || Number.isNaN(fileId)) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 });
  }

  const membership = await getRoomMembership(roomId, user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
  }

  const file = await prisma.roomFile.findFirst({
    where: { id: fileId, conversationId: roomId },
  });
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const isUploader = file.uploaderId === user.id;
  const isModerator = (ROLE_RANK[membership.role?.toLowerCase()] ?? -1) >= ROLE_RANK.admin;
  if (!isUploader && !isModerator) {
    return NextResponse.json({ error: 'Only the uploader or an admin can delete' }, { status: 403 });
  }

  // Storage first, then DB — so we never orphan a DB row pointing at live bytes.
  await deleteRoomFile(file.storageKey);
  await prisma.roomFile.delete({ where: { id: file.id } });

  return NextResponse.json({ success: true });
}
