import { z } from 'zod';

export const createTestimonialSchema = z.object({
  patientName: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  textEn: z.string().min(1),
  textAr: z.string().optional(),
  treatment: z.string().optional(),
  photoUrl: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();
