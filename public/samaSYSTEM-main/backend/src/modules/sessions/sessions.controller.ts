import { Request, Response, NextFunction } from 'express';
import * as sessionService from './sessions.service.js';
import { notify } from '../../shared/notify.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await sessionService.listSessions();
    res.json(sessions);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const session = await sessionService.getSession(id);
    res.json(session);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await sessionService.createSession(req.body);
    notify('notification.session_added', { name: req.body.fullname });
    res.status(201).json({ message: 'Session created successfully', session });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const session = await sessionService.updateSession(id, req.body);
    res.json({ message: 'Session updated successfully', session });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await sessionService.deleteSession(id);
    res.json({ message: 'Session deleted successfully' });
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const session = await sessionService.updateSessionStatus(id, status);
    res.json({ message: 'Status updated successfully', session });
  } catch (err) { next(err); }
}
