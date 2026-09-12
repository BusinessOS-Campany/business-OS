import { Request, Response, NextFunction } from 'express';
import * as serviceService from './services.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const services = await serviceService.listServices();
    res.json(services);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await serviceService.createService(req.body);
    res.status(201).json({ message: 'تم إضافة الخدمة بنجاح', service: s });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const s = await serviceService.updateService(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الخدمة بنجاح', service: s });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await serviceService.deleteService(req.params.id as string);
    res.json({ message: 'تم حذف الخدمة بنجاح' });
  } catch (err) { next(err); }
}
