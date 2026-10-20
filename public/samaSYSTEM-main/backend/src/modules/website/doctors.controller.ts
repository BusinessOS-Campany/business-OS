import { Request, Response, NextFunction } from 'express';
import * as doctorService from './doctors.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const doctors = (await doctorService.listDoctors()).map(d => ({ ...d, rating: Number(d.rating) }));
    res.json(doctors);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await doctorService.getDoctor(req.params.id as string);
    res.json({ ...d, rating: Number(d.rating) });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await doctorService.createDoctor(req.body);
    res.status(201).json({ message: 'تم إضافة الطبيب بنجاح', doctor: { ...d, rating: Number(d.rating) } });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const d = await doctorService.updateDoctor(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الطبيب بنجاح', doctor: { ...d, rating: Number(d.rating) } });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await doctorService.deleteDoctor(req.params.id as string);
    res.json({ message: 'تم حذف الطبيب بنجاح' });
  } catch (err) { next(err); }
}
