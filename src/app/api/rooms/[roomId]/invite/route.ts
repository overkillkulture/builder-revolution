import { getServerUser } from '@/lib/getServerUser';
import prisma from '@/lib/prisma/prisma';
import { NextResponse } from 'next/server';

// POST /api/rooms/:roomId/invite — invite a user to a private room
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const roomId = parseInt(params.roomId);
  const body = await request.json();
  const { userId: targetUserId, username } = body;

  // Verify the room exists and is a ROOM type
  const room = await prisma.conversation.findFirst({
    where: { id: roomId, type: 'ROOM' },
  });
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Verify the inviter is a member with owner or admin role
  const inviterMembership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId: roomId, userId: user.id },
    },
  });
  if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
    return NextResponse.json({ error: 'Only room owners and admins can invite' }, { status: 403 });
  }

  // Find the target user by ID or username
  let targetUser;
  if (targetUserId) {
    targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  } else if (username) {
    targetUser = await prisma.user.findUnique({ where: { username } });
  }

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId: roomId, userId: targetUser.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
  }

  // Add them
  await prisma.conversationMember.create({
    data: {
      conversationId: roomId,
      userId: targetUser.id,
      role: 'member',
    },
  });

  return NextResponse.json({
    success: true,
    message: `${targetUser.name || targetUser.username} added to ${room.name}`,
  });
}

// DELETE /api/rooms/:roomId/invite — remove a user from a room
export async function DELETE(
  request: Request,
  { params }: { params: { roomId: string } },
) {
  const [user] = await getServerUser();
  if (!user) return NextResponse.json({}, { status: 401 });

  const roomId = parseInt(params.roomId);
  const body = await request.json();
  const { userId: targetUserId } = body;

  // Verify the remover is owner
  const removerMembership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId: roomId, userId: user.id },
    },
  });
  if (!removerMembership || removerMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only room owners can remove members' }, { status: 403 });
  }

  // Can't remove yourself as owner
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself as owner' }, { status: 400 });
  }

  // deleteMany (not delete) so removing a non-member / already-removed user is a
  // no-op instead of a P2025 -> unhandled 500 (e.g. double-click remove) (S446).
  const removed = await prisma.conversationMember.deleteMany({
    where: { conversationId: roomId, userId: targetUserId },
  });
  if (removed.count === 0) {
    return NextResponse.json({ error: 'User is not a member of this room' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
