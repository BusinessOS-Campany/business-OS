import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listTestimonials() {
  return prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getTestimonial(id: string) {
  const t = await prisma.testimonial.findUnique({ where: { id } });
  if (!t) throw new NotFoundError('Testimonial');
  return t;
}

export async function createTestimonial(data: {
  patientName: string;
  rating?: number;
  textEn: string;
  textAr?: string;
  treatment?: string;
  photoUrl?: string;
  isFeatured?: boolean;
}) {
  return prisma.testimonial.create({
    data: {
      patientName: data.patientName,
      rating: data.rating ?? 5,
      textEn: data.textEn,
      textAr: data.textAr,
      treatment: data.treatment,
      photoUrl: data.photoUrl,
      isFeatured: data.isFeatured ?? false,
    },
  });
}

export async function updateTestimonial(id: string, data: {
  patientName?: string;
  rating?: number;
  textEn?: string;
  textAr?: string;
  treatment?: string;
  photoUrl?: string;
  isFeatured?: boolean;
}) {
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Testimonial');
  return prisma.testimonial.update({ where: { id }, data });
}

export async function deleteTestimonial(id: string) {
  const existing = await prisma.testimonial.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Testimonial');
  await prisma.testimonial.delete({ where: { id } });
}
