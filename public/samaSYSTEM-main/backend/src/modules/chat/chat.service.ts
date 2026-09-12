import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';

export async function listConversations(userId: string, archived?: boolean) {
  const participants = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      conversation: { deletedAt: null },
      ...(archived === undefined ? { archivedAt: null } : archived === true ? { archivedAt: { not: null } } : {}),
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } } },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: 'desc' } },
  });

  return participants
    .map(p => ({
      id: p.conversation.id,
      updatedAt: p.conversation.updatedAt,
      archivedAt: p.archivedAt,
      participants: p.conversation.participants.map(pp => pp.user),
      lastMessage: p.conversation.messages[0] || null,
      unreadCount: 0,
    }));
}

export async function getConversationMessages(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new ForbiddenError('Not a participant');

  const messages = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return messages;
}

export async function sendMessage(senderId: string, data: { conversationId?: string; recipientId?: string; content: string; attachment?: string; attachmentName?: string; attachmentSize?: number; contentType?: string }) {
  let conversationId = data.conversationId;

  if (!conversationId && data.recipientId) {
    const existing = await prisma.conversationParticipant.findFirst({
      where: {
        userId: senderId,
        conversation: {
          participants: { some: { userId: data.recipientId } },
          deletedAt: null,
        },
      },
      include: { conversation: { include: { participants: true } } },
    });

    if (existing && existing.conversation.participants.length === 2) {
      conversationId = existing.conversation.id;
    } else {
      const conversation = await prisma.conversation.create({ data: {} });
      await prisma.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: senderId },
          { conversationId: conversation.id, userId: data.recipientId },
        ],
      });
      conversationId = conversation.id;
    }
  }

  if (!conversationId) throw new NotFoundError('Conversation');

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!participant) throw new ForbiddenError('Not a participant');

  const message = await prisma.message.create({
    data: {
      conversationId, senderId, content: data.content,
      attachment: data.attachment,
      attachmentName: data.attachmentName,
      attachmentSize: data.attachmentSize,
      contentType: data.contentType,
    },
    include: { sender: { select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } } },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  return message;
}

export async function createConversation(userId: string, participantIds: string[]) {
  const allIds = [...new Set([userId, ...participantIds])];
  const conversation = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: allIds.map(id => ({ conversationId: conversation.id, userId: id })),
  });
  return prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: {
      participants: {
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } } },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

export async function archiveConversation(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new ForbiddenError('Not a participant');
  return prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: new Date() },
  });
}

export async function unarchiveConversation(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new ForbiddenError('Not a participant');
  return prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { archivedAt: null },
  });
}

export async function getUsers(userId: string) {
  return prisma.user.findMany({
    where: { id: { not: userId }, deletedAt: null, isActive: true, role: { not: 'PATIENT' } },
    select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true },
    orderBy: { firstName: 'asc' },
  });
}
