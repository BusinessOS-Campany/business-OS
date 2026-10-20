import { Request, Response, NextFunction } from 'express';
import * as calendarService from './calendar.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await calendarService.listEvents();
    res.json(events);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const ev = await calendarService.getEvent(req.params.id as string);
    res.json(ev);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const ev = await calendarService.createEvent(req.body);
    res.status(201).json({ message: 'Event created successfully', event: ev });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const ev = await calendarService.updateEvent(req.params.id as string, req.body);
    res.json({ message: 'Event updated successfully', event: ev });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await calendarService.deleteEvent(req.params.id as string);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) { next(err); }
}
