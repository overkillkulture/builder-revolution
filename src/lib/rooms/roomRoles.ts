import 'server-only';
import prisma from '@/lib/prisma/prisma';

// Numeric rank so minRole compares cleanly. Roles are stored lowercase on
// ConversationMember.role (seeded owner/admin/member; builder/guest reserved).
export const ROLE_RANK: Record<string, number> = {
  guest: 0,
  member: 1,
  builder: 2,
  admin: 3,
  owner: 4,
};

// Can a caller with `myRole` see a file gated at `minRole`?
export const canSee = (myRole: string | undefined, minRole: string) =>
  (ROLE_RANK[(myRole ?? '').toLowerCase()] ?? -1) >= (ROLE_RANK[minRole.toLowerCase()] ?? 99);

// The caller's ConversationMember row for a room, or null if not a member.
export async function getRoomMembership(conversationId: number, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
}
