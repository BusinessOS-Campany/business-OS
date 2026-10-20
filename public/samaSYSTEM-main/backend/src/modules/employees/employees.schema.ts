import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().optional(),
  phone: z.string().optional(),
  salary: z.coerce.number().positive().optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  salary: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});
