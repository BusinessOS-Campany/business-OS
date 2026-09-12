import { Request, Response, NextFunction } from 'express';
import * as insuranceCompanyService from './insurance-companies.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const companies = await insuranceCompanyService.listInsuranceCompanies();
    res.json(companies);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await insuranceCompanyService.getInsuranceCompany(req.params.id as string);
    res.json(c);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await insuranceCompanyService.createInsuranceCompany(req.body);
    res.status(201).json({ message: 'تم حفظ شركة التأمين بنجاح', insuranceCompany: c });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await insuranceCompanyService.updateInsuranceCompany(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث شركة التأمين بنجاح', insuranceCompany: c });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await insuranceCompanyService.deleteInsuranceCompany(req.params.id as string);
    res.json({ message: 'تم حذف شركة التأمين بنجاح' });
  } catch (err) { next(err); }
}
