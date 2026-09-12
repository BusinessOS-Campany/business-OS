import { Request, Response, NextFunction } from 'express';
import * as contactMessagesService from './contact-messages.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const messages = await contactMessagesService.listContactMessages();
    res.json(messages);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const m = await contactMessagesService.getContactMessage(req.params.id as string);
    res.json(m);
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const m = await contactMessagesService.updateContactMessage(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الرسالة بنجاح', messageItem: m });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await contactMessagesService.deleteContactMessage(req.params.id as string);
    res.json({ message: 'تم حذف الرسالة بنجاح' });
  } catch (err) { next(err); }
}
