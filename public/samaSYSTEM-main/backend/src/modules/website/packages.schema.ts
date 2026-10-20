import { z } from 'zod';

export const createPackageSchema = z.object({
  name: z.string().min(1),
  priceUsd: z.coerce.number().nonnegative(),
  priceYer: z.coerce.number().nonnegative(),
  features: z.array(z.string()).default([]),
  popular: z.boolean().optional(),
});

export const updatePackageSchema = createPackageSchema.partial();
