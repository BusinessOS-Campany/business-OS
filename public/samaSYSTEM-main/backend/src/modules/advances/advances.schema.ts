import { z } from 'zod';

export const createAdvanceSchema = z.object({
  employee: z.string().min(1),
  specialty: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

export const updateAdvanceSchema = z.object({
  employee: z.string().min(1).optional(),
  specialty: z.string().optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});
