import { Request, Response, NextFunction } from 'express';
import * as packageService from './packages.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const packages = await packageService.listPackages();
    res.json(packages);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await packageService.getPackage(req.params.id as string);
    res.json(p);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await packageService.createPackage(req.body);
    res.status(201).json({ message: 'تم حفظ الباقة بنجاح', package: p });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await packageService.updatePackage(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث الباقة بنجاح', package: p });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await packageService.deletePackage(req.params.id as string);
    res.json({ message: 'تم حذف الباقة بنجاح' });
  } catch (err) { next(err); }
}
