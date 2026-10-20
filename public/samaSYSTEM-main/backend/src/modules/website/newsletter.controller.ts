import { Request, Response, NextFunction } from 'express';
import * as newsletterService from './newsletter.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const subscribers = await newsletterService.listNewsletterSubscribers();
    res.json(subscribers);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await newsletterService.deleteNewsletterSubscriber(req.params.id as string);
    res.json({ message: 'تم حذف المشترك بنجاح' });
  } catch (err) { next(err); }
}
