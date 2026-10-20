import { Request, Response, NextFunction } from 'express';
import * as testimonialService from './testimonials.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const testimonials = await testimonialService.listTestimonials();
    res.json(testimonials);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const t = await testimonialService.getTestimonial(req.params.id as string);
    res.json(t);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const t = await testimonialService.createTestimonial(req.body);
    res.status(201).json({ message: 'تم إضافة الرأي بنجاح', testimonial: t });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const t = await testimonialService.updateTestimonial(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الرأي بنجاح', testimonial: t });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await testimonialService.deleteTestimonial(req.params.id as string);
    res.json({ message: 'تم حذف الرأي بنجاح' });
  } catch (err) { next(err); }
}
