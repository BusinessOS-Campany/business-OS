import { Request, Response, NextFunction } from 'express';
import * as galleryService from './gallery.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const images = await galleryService.listGalleryImages();
    res.json(images);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const img = await galleryService.getGalleryImage(req.params.id as string);
    res.json(img);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const img = await galleryService.createGalleryImage(req.body);
    res.status(201).json({ message: 'تم إضافة الصورة بنجاح', image: img });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const img = await galleryService.updateGalleryImage(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الصورة بنجاح', image: img });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await galleryService.deleteGalleryImage(req.params.id as string);
    res.json({ message: 'تم حذف الصورة بنجاح' });
  } catch (err) { next(err); }
}
