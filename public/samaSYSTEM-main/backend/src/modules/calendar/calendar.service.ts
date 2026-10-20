import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../shared/errors.js';

export async function listEvents() {
  return prisma.calendarEvent.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'asc' },
  });
}

export async function getEvent(id: string) {
  const ev = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!ev || ev.deletedAt) throw new NotFoundError('CalendarEvent');
  return ev;
}

export async function createEvent(data: {
  eventName: string;
  date: string;
  endDate?: string;
  type: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}) {
  return prisma.calendarEvent.create({
    data: {
      eventName: data.eventName,
      date: data.date,
      endDate: data.endDate || null,
      type: data.type,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      location: data.location || null,
      description: data.description || null,
    },
  });
}

export async function updateEvent(id: string, data: {
  eventName?: string;
  date?: string;
  endDate?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('CalendarEvent');
  return prisma.calendarEvent.update({
    where: { id },
    data,
  });
}

export async function deleteEvent(id: string) {
  const existing = await prisma.calendarEvent.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new NotFoundError('CalendarEvent');
  await prisma.calendarEvent.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
