import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'post';

export async function listBlogPosts() {
  return prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getBlogPost(id: string) {
  const p = await prisma.blogPost.findUnique({ where: { id } });
  if (!p) throw new NotFoundError('BlogPost');
  return p;
}

export async function createBlogPost(data: {
  titleEn: string;
  titleAr?: string;
  excerptEn?: string;
  excerptAr?: string;
  contentEn?: string;
  contentAr?: string;
  coverUrl?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: string;
}) {
  return prisma.blogPost.create({
    data: {
      slug: slugify(data.titleEn),
      titleEn: data.titleEn,
      titleAr: data.titleAr,
      excerptEn: data.excerptEn,
      excerptAr: data.excerptAr,
      contentEn: data.contentEn,
      contentAr: data.contentAr,
      coverUrl: data.coverUrl,
      category: data.category,
      tags: data.tags ?? [],
      isPublished: data.isPublished ?? false,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    },
  });
}

export async function updateBlogPost(id: string, data: {
  titleEn?: string;
  titleAr?: string;
  excerptEn?: string;
  excerptAr?: string;
  contentEn?: string;
  contentAr?: string;
  coverUrl?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  publishedAt?: string | null;
}) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('BlogPost');
  const { publishedAt, ...rest } = data;
  return prisma.blogPost.update({
    where: { id },
    data: {
      ...rest,
      ...(publishedAt !== undefined
        ? { publishedAt: publishedAt ? new Date(publishedAt) : null }
        : {}),
    },
  });
}

export async function deleteBlogPost(id: string) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('BlogPost');
  await prisma.blogPost.delete({ where: { id } });
}
