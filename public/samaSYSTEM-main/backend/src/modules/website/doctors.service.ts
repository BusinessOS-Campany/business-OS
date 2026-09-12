import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'doctor';

export async function listDoctors() {
  return prisma.doctor.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getDoctor(id: string) {
  const d = await prisma.doctor.findUnique({ where: { id } });
  if (!d) throw new NotFoundError('Doctor');
  return d;
}

export async function createDoctor(data: {
  name: string;
  nameAr?: string;
  specialty: string;
  specialtyAr?: string;
  bio?: string;
  photoUrl?: string;
  experienceYears?: number;
  rating?: number;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.doctor.create({
    data: {
      slug: slugify(data.name),
      name: data.name,
      nameAr: data.nameAr,
      specialty: data.specialty,
      specialtyAr: data.specialtyAr,
      bio: data.bio,
      photoUrl: data.photoUrl,
      experienceYears: data.experienceYears ?? 0,
      rating: data.rating ?? 5,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateDoctor(id: string, data: {
  name?: string;
  nameAr?: string;
  specialty?: string;
  specialtyAr?: string;
  bio?: string;
  photoUrl?: string;
  experienceYears?: number;
  rating?: number;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const existing = await prisma.doctor.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Doctor');
  return prisma.doctor.update({ where: { id }, data });
}

export async function deleteDoctor(id: string) {
  const existing = await prisma.doctor.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Doctor');
  await prisma.doctor.delete({ where: { id } });
}
