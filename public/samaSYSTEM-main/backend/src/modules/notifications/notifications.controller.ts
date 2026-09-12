import { Request, Response, NextFunction } from 'express';
import * as service from './notifications.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteOld();
    const notifications = await service.list();
    const unread = await service.unreadCount();
    res.json({ notifications, unread });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    await service.markRead(req.params.id as string);
    res.json({ message: 'Read' });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await service.markAllRead();
    res.json({ message: 'All read' });
  } catch (err) { next(err); }
}
