import { Request, Response, NextFunction } from 'express';
import * as coverageService from './coverages.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const coverages = await coverageService.listCoverages();
    res.json(coverages);
  } catch (err) { next(err); }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const lang = (req.query.lang as string) || 'en';
    const month = req.query.month as string | undefined;
    const result = await coverageService.listCoveragesByEmployee(req.params.id as string, month);
    const { t } = await import('../../shared/translate.js');
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const totalPrice = result.coverages.reduce((sum, c) => sum + c.price, 0);
    const totalShare = result.coverages.reduce((sum, c) => sum + (c.therapistShare ?? 0), 0);
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    res.render('coverages-report', {
      employeeName: result.employee.name,
      totalPrice,
      totalShare,
      month: month || '',
      coverages: result.coverages,
      generatedDate,
      lang,
      dir,
      t: (key: string) => t(key, lang),
    });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await coverageService.createCoverage(req.body);
    res.status(201).json({ message: 'تم إضافة التغطية بنجاح', coverage: c });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const c = await coverageService.updateCoverage(req.params.id as string, req.body);
    res.json({ message: 'تم تحديث التغطية بنجاح', coverage: c });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await coverageService.deleteCoverage(req.params.id as string);
    res.json({ message: 'تم حذف التغطية بنجاح' });
  } catch (err) { next(err); }
}
