import { z } from 'zod';

export const createGalleryImageSchema = z.object({
  url: z.string().min(1),
  titleEn: z.string().min(1),
  titleAr: z.string().optional(),
  categoryEn: z.string().optional(),
  categoryAr: z.string().optional(),
  description: z.string().optional(),
  ratio: z.string().default('aspect-[4/3]'),
  sortOrder: z.number().int().default(0),
});

export const updateGalleryImageSchema = createGalleryImageSchema.partial();
