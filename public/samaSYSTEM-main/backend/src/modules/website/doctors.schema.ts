import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  specialty: z.string().min(1),
  specialtyAr: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  experienceYears: z.coerce.number().int().nonnegative().default(0),
  rating: z.coerce.number().min(0).max(5).default(5),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const updateDoctorSchema = createDoctorSchema.partial();
