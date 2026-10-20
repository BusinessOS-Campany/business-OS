import { z } from 'zod';

export const createBlogPostSchema = z.object({
  titleEn: z.string().min(1),
  titleAr: z.string().optional(),
  excerptEn: z.string().optional(),
  excerptAr: z.string().optional(),
  contentEn: z.string().optional(),
  contentAr: z.string().optional(),
  coverUrl: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  publishedAt: z.string().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial().extend({
  publishedAt: z.string().nullable().optional(),
});
