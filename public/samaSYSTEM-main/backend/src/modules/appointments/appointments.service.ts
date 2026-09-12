import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listAppointments() {
  return prisma.appointment.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAppointment(id: string) {
  const a = await prisma.appointment.findUnique({ where: { id } });
  if (!a || a.deletedAt) throw new NotFoundError('Appointment');
  return a;
}

export async function createAppointment(data: {
  patient: string;
  phone?: string;
  therapist?: string;
  date?: string;
  notes?: string;
}) {
  return prisma.appointment.create({ data });
}

export async function updateAppointment(id: string, data: {
  patient?: string;
  phone?: string;
  therapist?: string;
  date?: string;
  notes?: string;
}) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Appointment');
  return prisma.appointment.update({ where: { id }, data });
}

export async function updateAppointmentStatus(id: string, status: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Appointment');
  return prisma.appointment.update({ where: { id }, data: { status } });
}

export async function deleteAppointment(id: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('Appointment');
  await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } });
}
