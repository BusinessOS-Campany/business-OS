import { z } from 'zod';

export const createInvoiceSchema = z.object({
  type: z.enum(['water', 'electricity']),
  amount: z.number().positive(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  type: z.enum(['water', 'electricity']).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});
