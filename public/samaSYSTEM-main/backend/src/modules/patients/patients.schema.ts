import { z } from 'zod';

export const createPatientSchema = z.object({
  examType: z.string().min(1),
  fullName: z.string().min(1),
  manualId: z.string().optional(),
  age: z.coerce.number().int().positive().optional(),
  gender: z.string().min(1),
  phone: z.string().optional(),
  date: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional(),
  payment_method: z.string().optional(),
  wallet_type: z.string().optional(),
  transaction_number: z.string().optional(),
  installments: z.string().optional(),
});

export const updatePatientSchema = z.object({
  examType: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  manualId: z.string().optional(),
  age: z.coerce.number().int().positive().optional(),
  gender: z.string().min(1).optional(),
  phone: z.string().optional(),
  date: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional(),
  payment_method: z.string().optional(),
  wallet_type: z.string().optional(),
  transaction_number: z.string().optional(),
  installments: z.string().optional(),
});
