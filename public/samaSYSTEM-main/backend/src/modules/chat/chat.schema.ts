import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1),
  attachment: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentSize: z.coerce.number().optional(),
  contentType: z.string().optional(),
});

export const createConversationSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1),
});
