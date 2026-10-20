import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  paymentMethod: z.string().optional(),
  employee: z.string().optional(),
  notes: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  category: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.string().optional(),
  paymentMethod: z.string().optional(),
  employee: z.string().optional(),
  notes: z.string().optional(),
});
