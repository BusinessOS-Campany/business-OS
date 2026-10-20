import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patient: z.string().min(1),
  phone: z.string().optional(),
  therapist: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  patient: z.string().min(1).optional(),
  phone: z.string().optional(),
  therapist: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['completed', 'pending', 'not_completed']),
});
