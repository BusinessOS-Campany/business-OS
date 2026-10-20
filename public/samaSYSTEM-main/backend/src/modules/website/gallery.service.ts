import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listGalleryImages() {
  return prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function getGalleryImage(id: string) {
  const img = await prisma.galleryImage.findUnique({ where: { id } });
  if (!img) throw new NotFoundError('GalleryImage');
  return img;
}

export async function createGalleryImage(data: {
  url: string;
  titleEn: string;
  titleAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  description?: string;
  ratio?: string;
  sortOrder?: number;
}) {
  return prisma.galleryImage.create({ data });
}

export async function updateGalleryImage(id: string, data: {
  url?: string;
  titleEn?: string;
  titleAr?: string;
  categoryEn?: string;
  categoryAr?: string;
  description?: string;
  ratio?: string;
  sortOrder?: number;
}) {
  const existing = await prisma.galleryImage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('GalleryImage');
  return prisma.galleryImage.update({ where: { id }, data });
}

export async function deleteGalleryImage(id: string) {
  const existing = await prisma.galleryImage.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('GalleryImage');
  await prisma.galleryImage.delete({ where: { id } });
}
