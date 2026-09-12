import { z } from 'zod';

export const createEventSchema = z.object({
  eventName: z.string().min(1),
  date: z.string().min(1),
  endDate: z.string().optional(),
  type: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const updateEventSchema = z.object({
  eventName: z.string().min(1).optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  type: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});
