import { z } from 'zod';

export const createInsuranceCompanySchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export const updateInsuranceCompanySchema = createInsuranceCompanySchema.partial();
