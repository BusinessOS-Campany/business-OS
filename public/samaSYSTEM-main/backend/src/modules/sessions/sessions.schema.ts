import { z } from 'zod';

export const createSessionSchema = z.object({
  fullname: z.string().min(1),
  session_type: z.string().min(1),
  speacial: z.string().optional(),
  session_date: z.string().optional().nullable(),
  price: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().nonnegative().optional()),
  notes: z.string().optional(),
  subscription_period: z.string().optional(),
  subscription_amount: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().optional()),
  subscription_day: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().int().optional()),
  subscription_attendance: z.string().optional(),
  installments: z.string().optional(),
  payment_method: z.string().optional(),
  wallet_type: z.string().optional(),
  transaction_number: z.string().optional(),
  prepaid: z.boolean().optional(),
});

export const updateSessionSchema = z.object({
  fullname: z.string().min(1).optional(),
  session_type: z.string().min(1).optional(),
  speacial: z.string().optional(),
  session_date: z.string().optional().nullable(),
  price: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().nonnegative().optional()),
  notes: z.string().optional(),
  subscription_period: z.string().optional(),
  subscription_amount: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().optional()),
  subscription_day: z.preprocess(v => (v === '' || v === null || v === undefined) ? undefined : v, z.coerce.number().int().optional()),
  subscription_attendance: z.string().optional(),
  installments: z.string().optional(),
  payment_method: z.string().optional(),
  wallet_type: z.string().optional(),
  transaction_number: z.string().optional(),
  prepaid: z.boolean().optional(),
});
