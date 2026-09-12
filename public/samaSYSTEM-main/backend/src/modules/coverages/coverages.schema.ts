import { z } from 'zod';

export const createCoverageSchema = z.object({
  name: z.string().min(1),
  sessionType: z.enum(['normal', 'hijama']).optional(),
  date: z.string().min(1),
  price: z.coerce.number().min(0),
  therapistShare: z.coerce.number().min(0).nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
});

export const updateCoverageSchema = z.object({
  name: z.string().min(1).optional(),
  sessionType: z.enum(['normal', 'hijama']).optional(),
  date: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  therapistShare: z.coerce.number().min(0).nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
});
