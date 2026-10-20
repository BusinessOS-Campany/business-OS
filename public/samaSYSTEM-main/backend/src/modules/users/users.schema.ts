import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  password: z.string().min(6).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'RECEPTIONIST', 'THERAPIST', 'PATIENT']),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'RECEPTIONIST', 'THERAPIST', 'PATIENT']).optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(128).optional(),
  permissions: z.array(z.string()).optional(),
});

export const statusSchema = z.object({
  isActive: z.boolean(),
});

export const permissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
